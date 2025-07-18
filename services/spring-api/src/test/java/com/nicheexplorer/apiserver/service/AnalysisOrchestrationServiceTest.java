package com.nicheexplorer.apiserver.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.nicheexplorer.generated.model.ArticleFetchResponse;
import com.nicheexplorer.generated.model.ClassifyResponse;
import com.nicheexplorer.generated.api.AiApi;
import com.nicheexplorer.generated.api.ArticlesApi;
import com.nicheexplorer.generated.api.TopicsApi;
import com.nicheexplorer.generated.invoker.ApiClient;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

public class AnalysisOrchestrationServiceTest {

    private static MockWebServer mockGenaiServer;
    private static MockWebServer mockFetcherServer;
    private AnalysisOrchestrationService orchestrationService;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @BeforeAll
    static void setUp() throws IOException {
        mockGenaiServer = new MockWebServer();
        mockGenaiServer.start();

        mockFetcherServer = new MockWebServer();
        mockFetcherServer.start();
    }

    @AfterAll
    static void tearDown() throws IOException {
        mockGenaiServer.shutdown();
        mockFetcherServer.shutdown();
    }

    @BeforeEach
    void initialize() {
        // Create an ApiClient with a properly configured ObjectMapper
        ApiClient genaiApiClient = new ApiClient();
        genaiApiClient.setBasePath(mockGenaiServer.url("/").toString());
        genaiApiClient.getObjectMapper().registerModule(new JavaTimeModule());
        AiApi aiApi = new AiApi(genaiApiClient);

        ApiClient fetcherApiClient = new ApiClient();
        fetcherApiClient.setBasePath(mockFetcherServer.url("/").toString());
        fetcherApiClient.getObjectMapper().registerModule(new JavaTimeModule());
        ArticlesApi articlesApi = new ArticlesApi(fetcherApiClient);

        // Assume topics service is also mocked, pointing to one of the existing servers for simplicity
        ApiClient topicsApiClient = new ApiClient();
        topicsApiClient.setBasePath(mockFetcherServer.url("/").toString());
        topicsApiClient.getObjectMapper().registerModule(new JavaTimeModule());
        TopicsApi topicsApi = new TopicsApi(topicsApiClient);

        orchestrationService = new AnalysisOrchestrationService(aiApi, articlesApi, topicsApi);
    }

    /**
     * Verifies that the service can correctly classify a user query by calling the
     * service to classify a user's query. It uses a MockWebServer to simulate
     * the `py-genai` API.
     *
     * Assertions:
     * - The service method returns a `ClassifyResponse` that is deeply equal
     *   to the mock response, verifying all fields.
     */
    @Test
    void whenClassifyQuery_thenReturnsClassification() throws JsonProcessingException {
        // Arrange: Set up the mock response from the py-genai service
        var mockResponse = new ClassifyResponse()
                .source(ClassifyResponse.SourceEnum.ARXIV)
                .sourceType(ClassifyResponse.SourceTypeEnum.RESEARCH)
                .suggestedCategory("cs.AI");

        mockGenaiServer.enqueue(new MockResponse()
                .setBody(objectMapper.writeValueAsString(mockResponse))
                .addHeader("Content-Type", "application/json"));

        // Act: Call the service method
        Mono<ClassifyResponse> responseMono = orchestrationService.classifyQuery("test query");

        // Assert: Use StepVerifier for reactive streams
        StepVerifier.create(responseMono)
                .assertNext(response -> assertThat(response)
                        .usingRecursiveComparison()
                        .isEqualTo(mockResponse))
                .verifyComplete();
    }

    /**
     * Tests the fetchArticles method.
     *
     * Test Description:
     * This test verifies that the service can correctly call the `py-fetcher`
     * service to fetch articles based on a classification result.
     *
     * Assertions:
     * - The service method returns an `ArticleFetchResponse` that is deeply
     *   equal to the mock response, verifying all fields.
     */
    @Test
    void whenFetchArticles_thenReturnsArticles() throws JsonProcessingException {
        // Arrange: Set up the mock response from the py-fetcher service
        var mockResponse = new ArticleFetchResponse()
                .totalFound(10);

        mockFetcherServer.enqueue(new MockResponse()
                .setBody(objectMapper.writeValueAsString(mockResponse))
                .addHeader("Content-Type", "application/json"));
        
        var classification = new ClassifyResponse()
                .source(ClassifyResponse.SourceEnum.ARXIV)
                .suggestedCategory("cs.AI");

        // Act
        Mono<ArticleFetchResponse> responseMono = orchestrationService.fetchArticles(classification, "test query", 100);

        // Assert
        StepVerifier.create(responseMono)
                .assertNext(response -> assertThat(response)
                        .usingRecursiveComparison()
                        .isEqualTo(mockResponse))
                .verifyComplete();
    }
} 