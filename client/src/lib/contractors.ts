import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import type { User } from './auth-store'

/**
 * Fetches contractor accounts from the backend (admin-only endpoint).
 * Pass `enabled: false` when the current user can't call /users (e.g. a
 * contractor viewing their own queue).
 */
export function useContractors(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options
  const [contractors, setContractors] = useState<Array<User>>([])
  const [loading, setLoading] = useState(enabled)
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setContractors([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    apiFetch<Array<User>>('/users?role=contractor')
      .then((data) => {
        if (!cancelled) setContractors(data)
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
  }, [enabled, refreshIndex])

  function refetch() {
    setRefreshIndex((index) => index + 1)
  }

  return { contractors, loading, refetch }
}
