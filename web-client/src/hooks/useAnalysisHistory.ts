import { useEffect, useState } from 'react'
import { analysisApi, AnalysisResponse, fetchAnalyses } from '@/api/client'

export const useAnalysisHistory = (initialLimit = 20) => {
  const [analyses, setAnalyses] = useState<AnalysisResponse[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refresh = async () => {
    setIsLoading(true)
    try {
      const list = await fetchAnalyses(initialLimit)
      setAnalyses(list)
    } finally {
      setIsLoading(false)
    }
  }

  const remove = async (id: string) => {
    await analysisApi.deleteAnalysis({ id })
    setAnalyses(prev => prev.filter(a => a.id !== id))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { analyses, isLoading, refresh, remove }
} 