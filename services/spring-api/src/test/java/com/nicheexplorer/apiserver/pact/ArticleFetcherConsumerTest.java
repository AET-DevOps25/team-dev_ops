package com.nicheexplorer.apiserver.pact;

import au.com.dius.pact.consumer.MockServer;
import au.com.dius.pact.consumer.dsl.PactDslWithProvider;
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt;
import au.com.dius.pact.consumer.junit5.PactTestFor;
import au.com.dius.pact.core.model.V4Pact;
import au.com.dius.pact.core.model.annotations.Pact;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.nicheexplorer.generated.model.Article;
import com.nicheexplorer.generated.model.ArticleFetchRequest;
import com.nicheexplorer.generated.model.ArticleFetchResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pact consumer test for api-server calling py-fetcher.
 * Uses OpenAPI models to ensure schema compliance.
 * 
 * Generates pact file: build/pacts/api-server-py-fetcher.json
 */
@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "py-fetcher")
public class ArticleFetcherConsumerTest {

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    @Pact(consumer = "api-server", provider = "py-fetcher")
    public V4Pact arxivArticlesFetch(PactDslWithProvider builder) throws JsonProcessingException {
        
        // Create test data using OpenAPI models
        var article = new Article()
            .id("2301.00001")
            .title("Advanced Machine Learning Techniques")
            .summary("This paper explores advanced ML techniques...")
            .link(URI.create("https://arxiv.org/abs/2301.00001"))
            .authors(List.of("John Doe", "Jane Smith"))
            .published(OffsetDateTime.parse("2023-01-01T12:00:00Z"))
            .source(Article.SourceEnum.ARXIV);

        var response = new ArticleFetchResponse()
            .articles(List.of(article))
            .totalFound(1)
            .source(ArticleFetchResponse.SourceEnum.ARXIV);

        var request = new ArticleFetchRequest()
            .source(ArticleFetchRequest.SourceEnum.ARXIV)
            .query("machine learning")
            .category("cs.AI")
            .limit(10);

        return builder
            .given("arxiv service is available")
            .uponReceiving("a request for machine learning articles")
                .method("POST")
                .path("/api/v1/articles")
                .headers(Map.of("Content-Type", "application/json"))
                .body(objectMapper.writeValueAsString(request))
            .willRespondWith()
                .status(200)
                .headers(Map.of("Content-Type", "application/json"))
                .body(objectMapper.writeValueAsString(response))
            .toPact(V4Pact.class);
    }

    @Test
    @PactTestFor(pactMethod = "arxivArticlesFetch") 
    public void shouldFetchArxivArticles(MockServer mockServer) {
        // Arrange
        var webClient = WebClient.builder()
            .baseUrl(mockServer.getUrl())
            .build();

        var request = new ArticleFetchRequest()
            .source(ArticleFetchRequest.SourceEnum.ARXIV)
            .query("machine learning")
            .category("cs.AI")
            .limit(10);

        // Act
        var response = webClient.post()
            .uri("/api/v1/articles")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(request)
            .retrieve()
            .bodyToMono(ArticleFetchResponse.class)
            .block();

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getSource()).isEqualTo(ArticleFetchResponse.SourceEnum.ARXIV);
        assertThat(response.getTotalFound()).isEqualTo(1);
        assertThat(response.getArticles()).hasSize(1);
        
        var article = response.getArticles().get(0);
        assertThat(article.getId()).isEqualTo("2301.00001");
        assertThat(article.getTitle()).isEqualTo("Advanced Machine Learning Techniques");
        assertThat(article.getSource()).isEqualTo(Article.SourceEnum.ARXIV);
        assertThat(article.getLink().toString()).startsWith("https://arxiv.org");
    }
} 