package com.nicheexplorer.apiserver.service;

import com.nicheexplorer.generated.model.*;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.nicheexplorer.generated.invoker.ApiClient;
import org.springframework.web.reactive.function.client.ExchangeStrategies;

import java.util.List;
import java.util.Map;

/**
 * Service that orchestrates API calls to microservices for the analysis workflow.
 * 
 * <p>This service directly uses generated API clients from the OpenAPI specification
 * to coordinate the analysis workflow across GenAI, Article Fetcher, and Topic Discovery services.</p>
 */
@Service
@Slf4j
public class AnalysisOrchestrationService {

    private static final Logger logger = LoggerFactory.getLogger(AnalysisOrchestrationService.class);

    private final WebClient genaiWebClient;
    private final WebClient fetcherWebClient;
    private final WebClient topicsWebClient;

    public AnalysisOrchestrationService(
            WebClient.Builder webClientBuilder,
            @Value("${genai.base-url:http://genai:8000}") String genaiUrl,
            @Value("${fetcher.base-url:http://article-fetcher:8200}") String fetcherUrl,
            @Value("${topic.base-url:http://topic-discovery:8100}") String topicsUrl) {

        logger.info("Initializing WebClients: genai={}, fetcher={}, topics={}", genaiUrl, fetcherUrl, topicsUrl);
        this.genaiWebClient = webClientBuilder.baseUrl(genaiUrl).build();

        ExchangeStrategies biggerBuffer = ExchangeStrategies.builder()
                .codecs(conf -> conf.defaultCodecs().maxInMemorySize(4 * 1024 * 1024)) // 4 MB
                .build();

        this.fetcherWebClient = webClientBuilder
                .baseUrl(fetcherUrl)
                .exchangeStrategies(biggerBuffer)
                .build();
        
        this.topicsWebClient = webClientBuilder.clone()
                .baseUrl(topicsUrl)
                .exchangeStrategies(biggerBuffer)
                .build();
    }

    public Mono<ClassifyResponse> classifyQuery(String query) {
        ClassifyRequest request = new ClassifyRequest().query(query);
        logger.info("Sending classify request: query='{}'", query);
        return genaiWebClient.post()
                .uri("/api/v1/classify")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(ClassifyResponse.class)
                .doOnError(e -> logger.error("Failed to classify query: {}", query, e));
    }

    public Mono<ArticleFetchResponse> fetchArticles(ClassifyResponse classification, String query, Integer maxArticles) {
        ArticleFetchRequest fetchRequest = new ArticleFetchRequest()
                .source(ArticleFetchRequest.SourceEnum.fromValue(classification.getSource().getValue()))
                .category(classification.getSuggestedCategory())
                .query(query)
                .limit(maxArticles);
        logger.info("Sending fetch articles request for source: {}", fetchRequest.getSource());
        return fetcherWebClient.post()
                .uri("/api/v1/articles")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(fetchRequest)
                .retrieve()
                .bodyToMono(ArticleFetchResponse.class)
                .doOnError(e -> logger.error("Failed to fetch articles for query: {}", query, e));
    }

    public Mono<EmbeddingResponse> generateEmbeddings(List<String> texts, List<String> ids) {
        EmbeddingRequest embeddingRequest = new EmbeddingRequest().texts(texts).ids(ids);
        logger.info("Sending embedding request for {} texts", texts.size());
        return genaiWebClient.post()
                .uri("/api/v1/embeddings")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(embeddingRequest)
                .retrieve()
                .bodyToMono(EmbeddingResponse.class)
                .doOnError(e -> logger.error("Failed to generate embeddings", e));
    }

    public Mono<TopicDiscoveryResponse> discoverTopics(String query, List<String> articleIds, List<Article> articles, Integer nrTopics, Integer minClusterSize) {
        TopicDiscoveryRequest discoveryRequest = new TopicDiscoveryRequest()
                .query(query)
                .articleIds(articleIds)
                .articles(articles)
                .nrTopics(nrTopics)
                .minClusterSize(minClusterSize);
        logger.info("Sending topic discovery request for query: {}", query);

        // ------------------------------------------------------------
        // Serialise the request using snake_case so that the FastAPI
        // service accepts the JSON (matches Pydantic model names)
        // ------------------------------------------------------------
        ObjectMapper snakeMapper = ApiClient.createDefaultObjectMapper()
                .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
                .setSerializationInclusion(JsonInclude.Include.NON_NULL);

        String payload;
        try {
            payload = snakeMapper.writeValueAsString(discoveryRequest);
        } catch (JsonProcessingException e) {
            logger.error("Failed to serialise TopicDiscoveryRequest", e);
            return Mono.error(e);
        }

        return topicsWebClient.post()
                .uri("/api/v1/topics/discover")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(TopicDiscoveryResponse.class)
                .doOnError(e -> logger.error("Failed to discover topics for query: {}", query, e));
    }
    
    public Mono<Map<String, List<String>>> getSourceCategories(String source) {
        logger.info("Fetching categories for source: {}", source);
        return fetcherWebClient.get()
                .uri("/api/v1/sources/{source}/categories", source)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, List<String>>>() {})
                .doOnError(e -> logger.error("Failed to get categories for source: {}", source, e));
    }
} 