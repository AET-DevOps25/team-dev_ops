package com.nicheexplorer.apiserver.service;

import com.nicheexplorer.generated.api.AiApi;
import com.nicheexplorer.generated.api.ArticlesApi;
import com.nicheexplorer.generated.api.TopicsApi;
import com.nicheexplorer.generated.model.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.Map;

/**
 * Service that orchestrates API calls to microservices for the analysis workflow.
 * 
 * <p>This service directly uses generated API clients from the OpenAPI specification
 * to coordinate the analysis workflow across GenAI, Article Fetcher, and Topic Discovery services.</p>
 */
@Service
@RequiredArgsConstructor
public class AnalysisOrchestrationService {

    private static final Logger logger = LoggerFactory.getLogger(AnalysisOrchestrationService.class);

    private final AiApi aiApi;
    private final ArticlesApi articlesApi;
    private final TopicsApi topicsApi;

    public Mono<ClassifyResponse> classifyQuery(String query) {
        return Mono.fromCallable(() -> {
            logger.info("Sending classify request: query='{}'", query);
            return aiApi.classifyQuery(new ClassifyRequest().query(query));
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<ArticleFetchResponse> fetchArticles(ClassifyResponse classification, String query, Integer maxArticles) {
        return Mono.fromCallable(() -> {
            ArticleFetchRequest fetchRequest = new ArticleFetchRequest()
                    .source(ArticleFetchRequest.SourceEnum.fromValue(classification.getSource().getValue()))
                    .query(query)
                    .limit(maxArticles);

            if (classification.getSuggestedCategory() != null) {
                fetchRequest.setCategory(classification.getSuggestedCategory());
            }
            logger.info("Sending fetch articles request for source: {}", fetchRequest.getSource());
            return articlesApi.fetchArticles(fetchRequest);
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<EmbeddingResponse> generateEmbeddings(List<String> texts, List<String> ids) {
        return Mono.fromCallable(() -> {
            EmbeddingRequest embeddingRequest = new EmbeddingRequest().texts(texts).ids(ids);
            logger.info("Sending embedding request for {} texts", texts.size());
            return aiApi.generateEmbeddings(embeddingRequest);
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<TopicDiscoveryResponse> discoverTopics(String query, List<String> articleIds, List<Article> articles, Integer nrTopics, Integer minClusterSize) {
        return Mono.fromCallable(() -> {
            TopicDiscoveryRequest discoveryRequest = new TopicDiscoveryRequest()
                    .query(query)
                    .articleIds(articleIds)
                    .articles(articles)
                    .nrTopics(nrTopics)
                    .minClusterSize(minClusterSize);
            logger.info("Sending topic discovery request for query: {}", query);
            return topicsApi.discoverTopics(discoveryRequest);
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<QueryBuilderResponse> buildSourceQuery(String source, QueryBuilderRequest request) {
        return Mono.fromCallable(() -> {
            logger.info("Building query for source: {}", source);
            return aiApi.buildSourceQuery(source, request);
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<Map<String, List<String>>> getSourceCategories(String source) {
        return Mono.fromCallable(() -> {
            logger.info("Fetching categories for source: {}", source);
            return articlesApi.getSourceCategories(source);
        }).subscribeOn(Schedulers.boundedElastic());
    }
} 