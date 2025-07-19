// Centralised OpenAPI client configuration – generated code lives in @/generated
import { Configuration, AnalysisApi, ArticlesApi, TopicsApi } from '@/generated/api'
import type { AnalysisResponse } from '@/generated/api'

// Pick base URL from env or fall back to current origin so the same build runs locally & in prod
const configuration = new Configuration({
  basePath: import.meta.env.VITE_API_URL ?? window.location.origin,
})

// Pre-configured API instances
export const analysisApi = new AnalysisApi(configuration)
export const articlesApi = new ArticlesApi(configuration)
export const topicsApi = new TopicsApi(configuration)

// Forward frequently used types to callers so they can `import { AnalyzeRequest } from "@/api/client"`
export type {
  AnalysisResponse,
  AnalyzeRequest,
  GetSourceCategoriesSourceEnum,
  TopicDiscoveryRequest,
  TopicDiscoveryResponse,
  Article,
  Topic,
  AnalysisResponseTypeEnum,
  AnalysisResponseStatusEnum,
} from '@/generated/api'

// Helper – normalise listAnalyses response (spec envelope vs bare array)
export const fetchAnalyses = async (limit?: number): Promise<AnalysisResponse[]> => {
  const res = await analysisApi.listAnalyses({ limit })
  const data = res.data as unknown
  if (Array.isArray(data)) return data as AnalysisResponse[]
  if (data && typeof data === 'object' && 'items' in (data as any)) {
    return ((data as any).items ?? []) as AnalysisResponse[]
  }
  console.warn('Unexpected /api/analyses response shape', data)
  return []
} 