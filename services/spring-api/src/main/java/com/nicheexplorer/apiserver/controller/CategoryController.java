package com.nicheexplorer.apiserver.controller;

import com.nicheexplorer.apiserver.service.AnalysisOrchestrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

/**
 * REST controller providing source-specific categories and query building functionality.
 * 
 * <p>This controller provides access to categories for different content sources
 * (ArXiv, Reddit, etc.) and intelligent query building features. It delegates to the
 * appropriate microservices based on the requested source.</p>
 */
@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class CategoryController {

    private final AnalysisOrchestrationService orchestrationService;

    /**
     * Retrieves available categories for the specified content source.
     * 
     * <p>Currently supports:
     * <ul>
     *   <li>arxiv - Academic paper categories from ArXiv</li>
     *   <li>reddit - Subreddit categories (coming soon)</li>
     * </ul>
     *
     * @param source The content source (arxiv, reddit, etc.)
     * @return Map of category groups to their respective categories
     */
    @GetMapping("/sources/{source}/categories")
    public Mono<ResponseEntity<Map<String, List<String>>>> getSourceCategories(@PathVariable("source") String source) {
        return orchestrationService.getSourceCategories(source)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }
} 