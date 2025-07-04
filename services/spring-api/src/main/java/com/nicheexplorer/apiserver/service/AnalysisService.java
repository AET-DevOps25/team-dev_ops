package com.nicheexplorer.apiserver.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nicheexplorer.generated.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalysisService {
    
    private static final Logger logger = LoggerFactory.getLogger(AnalysisService.class);

    private final JdbcTemplate jdbcTemplate;
    private final AnalysisOrchestrationService orchestrationService;
    private final ObjectMapper objectMapper;

    public void startAnalysis(AnalyzeRequest request) {
        UUID analysisId = UUID.randomUUID();
        startAnalysisWithId(analysisId, request);
    }

    /**
     * Starts an analysis using a pre-generated ID (used by controller so the client immediately knows the id).
     */
    public void startAnalysisWithId(UUID analysisId, AnalyzeRequest request) {
        String query = request.getQuery();
        logger.info("Starting analysis {} for query: '{}'", analysisId, query);

        // Insert a stub analysis row immediately so that the client can poll
        // GET /analyses/{id} without receiving 404 while the async pipeline
        // (classification, fetching, clustering) is still in progress.
        try {
            jdbcTemplate.update("INSERT INTO analysis (id, query, type, feed_url, total_articles_processed, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                    analysisId,
                    query,
                    "research",         // default temporary type avoids enum mismatch
                    "pending",          // temporary feed_url – will be updated
                    0,
                    Timestamp.from(Instant.now()));
        } catch (Exception e) {
            logger.warn("Could not pre-insert stub analysis row (may already exist): {}", e.getMessage());
        }

        orchestrationService.classifyQuery(query)
                .flatMap(classification -> {
                    // Initial save to DB
                    String analysisType = "research".equalsIgnoreCase(classification.getSourceType().getValue()) ? "research" : "community";
                    String feedUrl = buildFeedUrl(classification);
                    return Mono.fromRunnable(() -> jdbcTemplate.update(
                            "UPDATE analysis SET type = ?, feed_url = ? WHERE id = ?",
                            analysisType, feedUrl, analysisId
                    )).thenReturn(classification);
                })
                .flatMap(classification ->
                        orchestrationService.fetchArticles(classification, query)
                                .zipWith(Mono.just(classification))
                )
                .flatMap(tuple -> {
                    ArticleFetchResponse fetchResponse = tuple.getT1();
                    ClassifyResponse classification = tuple.getT2();
                    List<Article> articles = fetchResponse.getArticles();
                    List<String> articleIds = fetchResponse.getArticles().stream().map(Article::getId).toList();

                    // Always update processed count
                    Mono<Void> dbUpdate = Mono.fromRunnable(() -> jdbcTemplate.update(
                            "UPDATE analysis SET total_articles_processed = ? WHERE id = ?",
                            articles.size(), analysisId));

                    if (articles.isEmpty()) {
                        // Short-circuit: no articles means no topics.
                        TopicDiscoveryResponse emptyResp = new TopicDiscoveryResponse()
                                .query(query)
                                .topics(Collections.emptyList())
                                .totalArticlesProcessed(0);
                        return dbUpdate.then(Mono.just(emptyResp));
                    }

                    Mono<TopicDiscoveryResponse> discoveryMono = orchestrationService.discoverTopics(query, articleIds, articles);

                    return dbUpdate.then(discoveryMono);
                })
                .flatMap(discoveredTopics -> {
                    try {
                        saveAnalysisResults(analysisId, discoveredTopics);
                        return Mono.empty();
                    } catch (JsonProcessingException e) {
                        return Mono.error(e);
                    }
                })
                .subscribe(
                        null, // onNext is not needed as we just want to trigger the chain
                        error -> logger.error("Failed to complete analysis {}", analysisId, error),
                        () -> logger.info("Successfully completed analysis {}", analysisId)
                );
    }

    private String buildFeedUrl(ClassifyResponse classification) {
        if (classification.getSource() == ClassifyResponse.SourceEnum.ARXIV) {
            String categoryOrQuery = classification.getSuggestedCategory();
            // If LLM already produced a full query (contains "cat:" or "all:") just relay
            if (categoryOrQuery.contains("cat:") || categoryOrQuery.contains("all:")) {
                // Encode the entire query part so it forms a valid URI (quotes and spaces would break URI.create)
                try {
                    String encoded = java.net.URLEncoder.encode(categoryOrQuery, java.nio.charset.StandardCharsets.UTF_8);
                    return "http://export.arxiv.org/api/query?search_query=" + encoded;
                } catch (Exception e) {
                    // Fallback to raw (will still fail later but at least logged)
                    logger.warn("Failed to URL-encode advanced arXiv query: {}", categoryOrQuery, e);
                    return "http://export.arxiv.org/api/query?search_query=" + categoryOrQuery;
                }
            }
            // Otherwise treat as plain category
            return "http://export.arxiv.org/api/query?search_query=cat:" + categoryOrQuery;
        } else if (classification.getSource() == ClassifyResponse.SourceEnum.REDDIT) {
            String category = classification.getSuggestedCategory();
            return "https://www.reddit.com/r/" + category + ".json";
        }
        return "unknown";
    }

    private void saveAnalysisResults(UUID analysisId, TopicDiscoveryResponse discoveredTopics) throws JsonProcessingException {
        // Save topics and articles in a transaction
        for (Topic topic : discoveredTopics.getTopics()) {
            jdbcTemplate.update(
                    "INSERT INTO topic (id, analysis_id, title, description, relevance, article_count) VALUES (?, ?, ?, ?, ?, ?)",
                    UUID.fromString(topic.getId()), analysisId, topic.getTitle(), topic.getDescription(), topic.getRelevance(), topic.getArticleCount()
            );

            for (Article article : topic.getArticles()) {
                UUID articleUuid;
                try {
                    // Create deterministic UUID based on the raw (external) ID so duplicates are avoided
                    articleUuid = UUID.nameUUIDFromBytes(article.getId().getBytes());
                } catch (IllegalArgumentException ex) {
                    articleUuid = UUID.randomUUID();
                }

                jdbcTemplate.update(
                        "INSERT INTO article (id, topic_id, analysis_id, title, link, snippet) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING",
                        articleUuid, UUID.fromString(topic.getId()), analysisId,
                        article.getTitle(), article.getLink().toString(), article.getSummary()
                );
            }
        }
    }

    public List<AnalysisResponse> getAnalyses(int limit, int offset) {
        String sql = "SELECT * FROM analysis ORDER BY created_at DESC LIMIT ? OFFSET ?";
        List<AnalysisResponse> analyses = jdbcTemplate.query(sql, new AnalysisResponseMapper(), limit, offset);
        analyses.forEach(this::hydrateAnalysisResponse);
        return analyses;
    }

    public AnalysisResponse getAnalysisById(String id) {
        String sql = "SELECT * FROM analysis WHERE id = ?";
        List<AnalysisResponse> results = jdbcTemplate.query(sql, new AnalysisResponseMapper(), UUID.fromString(id));
        if (results.isEmpty()) {
            return null;
        }
        AnalysisResponse response = results.get(0);
        hydrateAnalysisResponse(response);
        return response;
    }

    private void hydrateAnalysisResponse(AnalysisResponse response) {
        // Fetch and set topics for the analysis
        String topicsSql = "SELECT * FROM topic WHERE analysis_id = ?";
        List<Topic> topics = jdbcTemplate.query(topicsSql, new TopicMapper(), response.getId());
        
        // Fetch and set articles for each topic
        topics.forEach(topic -> {
            String articlesSql = "SELECT * FROM article WHERE topic_id = ?";
            List<Map<String, Object>> articles = jdbcTemplate.queryForList(articlesSql, UUID.fromString(topic.getId()));
            topic.setArticles(articles.stream().map(this::mapToArticle).collect(Collectors.toList()));
        });
        
        response.setTopics(topics);
    }
    
    private Article mapToArticle(Map<String, Object> row) {
        Article article = new Article();
        article.setId(row.get("id").toString());
        article.setTitle((String) row.get("title"));
        article.setLink(URI.create((String) row.get("link")));
        article.setSummary((String) row.get("snippet"));
        return article;
    }

    public void deleteAnalysis(String id) {
        jdbcTemplate.update("DELETE FROM analysis WHERE id = ?", UUID.fromString(id));
    }

    private static class AnalysisResponseMapper implements RowMapper<AnalysisResponse> {
        @Override
        public AnalysisResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
            AnalysisResponse response = new AnalysisResponse();
            response.setId(UUID.fromString(rs.getString("id")));
            response.setQuery(rs.getString("query"));
            // Accept case-insensitive enum values (DB may contain legacy capitalized entries)
            String typeValue = rs.getString("type");
            response.setType(AnalysisResponse.TypeEnum.fromValue(typeValue.toLowerCase()));
            response.setFeedUrl(URI.create(rs.getString("feed_url")));
            response.setTotalArticlesProcessed(rs.getInt("total_articles_processed"));
            response.setCreatedAt(rs.getTimestamp("created_at").toInstant().atOffset(ZoneOffset.UTC));
            return response;
        }
    }

    private static class TopicMapper implements RowMapper<Topic> {
        @Override
        public Topic mapRow(ResultSet rs, int rowNum) throws SQLException {
            Topic topic = new Topic();
            topic.setId(rs.getString("id"));
            topic.setTitle(rs.getString("title"));
            topic.setDescription(rs.getString("description"));
            topic.setRelevance(rs.getInt("relevance"));
            topic.setArticleCount(rs.getInt("article_count"));
            topic.setArticles(Collections.emptyList()); // Will be hydrated later
            return topic;
        }
    }

    public int countAnalyses() {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM analysis", Integer.class);
    }
} 