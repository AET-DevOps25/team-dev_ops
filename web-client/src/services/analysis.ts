// OpenAPI-first service - uses generated TypeScript client
import { AnalysisApi, ArticlesApi, TopicsApi, Configuration } from '../generated/api';
import type { 
  AnalysisResponse, 
  AnalyzeRequest,
  GetSourceCategoriesSourceEnum,
  TopicDiscoveryRequest,
  TopicDiscoveryResponse,
  ListAnalyses200Response
} from '../generated/api';

// Create configuration for the API client
const configuration = new Configuration({
  basePath: window.location.origin,
});

// Initialize API clients
const analysisApi = new AnalysisApi(configuration);
const articlesApi = new ArticlesApi(configuration);
const topicsApi = new TopicsApi(configuration);

export class AnalysisService {
  /**
   * Start a new analysis
   */
  async startAnalysis(request: AnalyzeRequest): Promise<string> {
    const response = await analysisApi.startAnalysis({ analyzeRequest: request });
    const id = (response.data as any)?.id;
    return id as string;
  }

  /**
   * Get list of analyses
   */
  async getAnalyses(limit?: number): Promise<AnalysisResponse[]> {
    const response = await analysisApi.listAnalyses({ limit });

    // The Spring backend currently returns a bare array of AnalysisResponse
    // while the OpenAPI spec expects an envelope { total, limit, offset, items }
    // Support both formats to avoid runtime errors.

    const data = response.data as unknown;

    // 1) Spec-compliant envelope object
    if (data && typeof data === 'object' && 'items' in (data as any)) {
      const envelope = data as ListAnalyses200Response;
      return envelope.items ?? [];
    }

    // 2) Plain array fallback
    if (Array.isArray(data)) {
      return data as AnalysisResponse[];
    }

    // 3) Unexpected shape – log and return empty list to keep UI stable
    console.warn('Unexpected /api/analyses response shape', data);
    return [];
  }

  /**
   * Get a specific analysis by ID
   */
  async getAnalysis(id: string): Promise<AnalysisResponse> {
    const response = await analysisApi.getAnalysis({ id });
    return response.data;
  }

  /**
   * Delete an analysis
   */
  async deleteAnalysis(id: string): Promise<void> {
    await analysisApi.deleteAnalysis({ id });
  }

  /**
   * Get available source categories (for ArXiv)
   */
  async getSourceCategories(source: GetSourceCategoriesSourceEnum): Promise<{ [key: string]: Array<string>; }> {
    const response = await articlesApi.getSourceCategories({ source });
    return response.data;
  }

  /**
   * Discover topics for articles
   */
  async discoverTopics(request: TopicDiscoveryRequest): Promise<TopicDiscoveryResponse> {
    const response = await topicsApi.discoverTopics({ topicDiscoveryRequest: request });
    return response.data;
  }
}

// Export a singleton instance
export const analysisService = new AnalysisService();

// Re-export types from generated client
export type {
  AnalysisResponse,
  AnalyzeRequest,
  GetSourceCategoriesSourceEnum,
  TopicDiscoveryRequest,
  TopicDiscoveryResponse,
  Article,
  Topic,
  AnalysisResponseTypeEnum
} from '../generated/api'; 