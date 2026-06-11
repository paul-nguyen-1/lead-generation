import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiFetch } from './api'

export type ScrapeJobStatus = 'running' | 'completed' | 'failed'

export interface GenerationStatus {
  running: boolean
  jobId: string | null
  status: ScrapeJobStatus | null
  leadsCreated: number
  leadsDuplicate: number
  leadLimit: number
}

const POLL_INTERVAL_MS = 2000
const GENERATION_LIMIT = 15

interface UseLeadGenerationOptions {
  enabled: boolean
}

export function useLeadGeneration({ enabled }: UseLeadGenerationOptions) {
  const [status, setStatus] = useState<GenerationStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [pollKey, setPollKey] = useState(0)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    function tick() {
      apiFetch<GenerationStatus>('/scraper/generate/status')
        .then((data) => {
          if (cancelled) return
          setStatus(data)
          setError(null)
          if (data.running) {
            timeoutId = setTimeout(() => void tick(), POLL_INTERVAL_MS)
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setError(
            err instanceof ApiError
              ? err.message
              : 'Failed to load lead generation status',
          )
        })
    }

    tick()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [enabled, pollKey])

  const generate = useCallback(async () => {
    setError(null)
    setStarting(true)
    try {
      await apiFetch('/scraper/generate', {
        method: 'POST',
        body: { limit: GENERATION_LIMIT },
      })
      setPollKey((key) => key + 1)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to start lead generation',
      )
    } finally {
      setStarting(false)
    }
  }, [])

  return { status, error, starting, generate }
}
