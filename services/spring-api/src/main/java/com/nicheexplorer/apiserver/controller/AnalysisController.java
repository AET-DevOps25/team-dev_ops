package com.nicheexplorer.apiserver.controller;

import com.nicheexplorer.apiserver.service.AnalysisService;
import com.nicheexplorer.generated.model.AnalysisResponse;
import com.nicheexplorer.generated.model.AnalyzeRequest;
import com.nicheexplorer.generated.model.ListAnalyses200Response;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for the main analysis operations in NicheExplorer.
 *
 * <p>This controller provides the primary API endpoints for executing research
 * analysis workflows, managing analysis history, and performing administrative
 * operations. All endpoints use OpenAPI-generated DTOs for type safety.</p>
 *
 * <h2>Available Operations:</h2>
 * <ul>
 *   <li><strong>POST /api/analyses</strong> - Execute complete analysis workflow</li>
 *   <li><strong>GET /api/analyses</strong> - Retrieve paginated analysis history</li>
 *   <li><strong>GET /api/analyses/{id}</strong> - Get specific analysis by ID</li>
 *   <li><strong>DELETE /api/analyses/{id}</strong> - Delete a specific analysis</li>
 * </ul>
 *
 * <p>All endpoints support CORS for web client integration and include proper
 * validation, error handling, and HTTP status codes.</p>
 *
 * @see com.nicheexplorer.apiserver.service.AnalysisService
 */
@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AnalysisController {

    private final AnalysisService analysisService;

    /**
     * Executes a complete research analysis for the given query.
     *
     * <p>This endpoint orchestrates the full analysis pipeline including
     * source classification, article fetching, embedding generation,
     * topic discovery, and result persistence.</p>
     *
     * <h4>Request Parameters:</h4>
     * <ul>
     *   <li><code>query</code> - The research question (required)</li>
     *   <li><code>source</code> - Source override (optional: "arxiv", "reddit", etc.)</li>
     *   <li><code>source_type</code> - Source type override (optional: "research", "community")</li>
     *   <li><code>category</code> - Category override (optional)</li>
     *   <li><code>maxArticles</code> - Maximum articles to process (optional, default: 50)</li>
     * </ul>
     *
     * @param analyzeRequest the analysis request with query and optional parameters
     * @return no content response
     */
    @PostMapping("/analyses")
    public ResponseEntity<Map<String, String>> startAnalysis(@RequestBody AnalyzeRequest analyzeRequest) {
        UUID id = UUID.randomUUID();
        analysisService.startAnalysisWithId(id, analyzeRequest);
        return ResponseEntity.accepted().body(Map.of("id", id.toString()));
    }

    /**
     * Retrieves paginated analysis history.
     *
     * <p>Returns a list of previous analyses ordered by creation date (newest first).
     * Each analysis includes basic metadata but not full topic/article data.</p>
     *
     * @param limit the number of results to return (default: 20)
     * @param offset the number of results to skip (default: 0) 
     * @return list of historical analysis responses
     */
    @GetMapping("/analyses")
    public ResponseEntity<ListAnalyses200Response> listAnalyses(
            @RequestParam(value = "limit", required = false, defaultValue = "20") Integer limit,
            @RequestParam(value = "offset", required = false, defaultValue = "0") Integer offset) {

        // Fetch paginated items
        List<AnalysisResponse> items = analysisService.getAnalyses(limit, offset);

        // Get total count for pagination metadata
        int total = analysisService.countAnalyses();

        // Build response envelope using OpenAPI-generated DTO
        ListAnalyses200Response envelope = new ListAnalyses200Response()
                .total(total)
                .limit(limit)
                .offset(offset)
                .items(items);

        return ResponseEntity.ok(envelope);
    }

    /**
     * Retrieves a specific analysis by ID.
     *
     * <p>Returns the full analysis data including all topics and articles.</p>
     *
     * @param id the unique identifier of the analysis
     * @return the complete analysis response
     */
    @GetMapping("/analyses/{id}")
    public ResponseEntity<AnalysisResponse> getAnalysis(@PathVariable("id") String id) {
        AnalysisResponse res = analysisService.getAnalysisById(id);
        if (res == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(res);
    }

    /**
     * Deletes a specific analysis by ID.
     *
     * @param id the unique identifier of the analysis
     * @return no content response
     */
    @DeleteMapping("/analyses/{id}")
    public ResponseEntity<Void> deleteAnalysis(@PathVariable("id") String id) {
        analysisService.deleteAnalysis(id);
        return ResponseEntity.noContent().build();
    }
}
