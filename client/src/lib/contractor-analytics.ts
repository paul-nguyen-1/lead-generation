import { useEffect, useState } from 'react'
import { apiFetch } from './api'

export interface ContractorAnalytics {
  id: string
  name: string
  rank: number
  totalLeads: number
  completedLeads: number
  rejectedLeads: number
  inProgressLeads: number
  approvalRate: number | null
  leadsLast7Days: number
  avgReviewHours: number | null
  efficiencyScore: number
}

/**
 * Fetches per-contractor lead-generation efficiency stats, ranked for the
 * home dashboard (admin-only).
 */
export function useContractorAnalytics() {
  const [contractors, setContractors] = useState<Array<ContractorAnalytics>>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiFetch<{ contractors: Array<ContractorAnalytics> }>('/scraper/analytics')
      .then((data) => {
        if (!cancelled) setContractors(data.contractors)
      })
      .catch(() => {
        if (!cancelled) setContractors([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshIndex])

  function refetch() {
    setRefreshIndex((index) => index + 1)
  }

  return { contractors, loading, refetch }
}
