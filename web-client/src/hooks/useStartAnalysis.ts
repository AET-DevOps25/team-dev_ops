import { useState, useRef } from 'react'
import { analysisApi, AnalyzeRequest } from '@/api/client'
import { AnalysisResponseStatusEnum } from '@/generated/api/models/analysis-response'

interface UseStartAnalysisOptions {
  onFinished?: () => Promise<void> | void
  pollingIntervalMs?: number
  maxWaitMs?: number
}

export const useStartAnalysis = (opts: UseStartAnalysisOptions = {}) => {
  const { onFinished, pollingIntervalMs = 2000, maxWaitMs = 600000 } = opts
  const [loadingMessage, setLoadingMessage] = useState<string>('')

  const discoverStepRef = useRef<number>(0)
  const lastDiscoverUpdateRef = useRef<number>(0)
  const prevStatusRef = useRef<AnalysisResponseStatusEnum | null>(null)

  const statusMessages: Record<AnalysisResponseStatusEnum, string> = {
    [AnalysisResponseStatusEnum.Pending]: 'Waiting in queue…',
    [AnalysisResponseStatusEnum.Classifying]: 'Classifying query…',
    [AnalysisResponseStatusEnum.FetchingArticles]: 'Fetching articles…',
    [AnalysisResponseStatusEnum.EmbeddingArticles]: 'Embedding articles…',
    [AnalysisResponseStatusEnum.DiscoveringTopics]: 'Discovering topics…',
    [AnalysisResponseStatusEnum.Completed]: 'Completed',
    [AnalysisResponseStatusEnum.Failed]: 'Failed',
  }

  const discoveringMessages = [
    'Starting topic clustering…',
    'Extracting term frequencies…',
    'Running BERTopic…',
    'Generating topic representations…',
    'Labelling topics with LLM…',
  ]

  const DISCOVER_STEP_INTERVAL_MS = 7000

  const startAnalysis = async (req: AnalyzeRequest): Promise<void> => {
    return new Promise<void>(async (resolve) => {
      try {
        setLoadingMessage('Starting analysis...')
        const startRes = await analysisApi.startAnalysis({ analyzeRequest: req })
        // Location header or body fallback
        const loc = (startRes.headers?.location ?? startRes.headers?.Location) as string | undefined
        let analysisId = loc ? loc.split('/').pop()! : undefined
        if (!analysisId) {
          const body = (startRes as any).data
          if (body && typeof body === 'object' && 'id' in body) {
            analysisId = body.id as string
          }
        }
        if (!analysisId) {
          alert('Server did not return analysis id')
          setLoadingMessage('')
          resolve()
          return
        }

        const startTs = Date.now()

        const poll = async () => {
          try {
            const details = await analysisApi.getAnalysis({ id: analysisId! })
            const friendly = statusMessages[details.data.status as AnalysisResponseStatusEnum] || 'Processing…'

            if (details.data.status === AnalysisResponseStatusEnum.DiscoveringTopics) {
              if (prevStatusRef.current !== AnalysisResponseStatusEnum.DiscoveringTopics) {
                discoverStepRef.current = 0
                lastDiscoverUpdateRef.current = Date.now()
                setLoadingMessage(discoveringMessages[0])
              } else {
                const now = Date.now()
                if (now - lastDiscoverUpdateRef.current >= DISCOVER_STEP_INTERVAL_MS) {
                  const next = Math.min(discoverStepRef.current + 1, discoveringMessages.length - 1)
                  discoverStepRef.current = next
                  lastDiscoverUpdateRef.current = now
                  setLoadingMessage(discoveringMessages[next])
                }
              }
            } else {
              setLoadingMessage(friendly)
              discoverStepRef.current = 0
              lastDiscoverUpdateRef.current = 0
            }

            if (
              details.data.status === AnalysisResponseStatusEnum.Completed ||
              details.data.status === AnalysisResponseStatusEnum.Failed
            ) {
              setLoadingMessage('')
              if (onFinished) await onFinished()
              resolve()
              return
            }
            prevStatusRef.current = details.data.status as AnalysisResponseStatusEnum
          } catch (err) {
            console.error('Polling failed', err)
          }
          if (Date.now() - startTs < maxWaitMs) {
            setTimeout(poll, pollingIntervalMs)
          } else {
            setLoadingMessage('')
            resolve()
          }
        }

        poll()
      } catch (err) {
        console.error('Analysis failed', err)
        alert('Failed to start analysis. Please try again.')
        setLoadingMessage('')
        resolve()
      }
    })
  }

  return { startAnalysis, loadingMessage }
} 