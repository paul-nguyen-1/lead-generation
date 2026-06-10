import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import { apiFetch, configureApi } from './api'

const STORAGE_KEY = 'lead-pipeline:auth'

export type Role = 'admin' | 'contractor'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
}

interface AuthResult {
  accessToken: string
  refreshToken: string
  user: User
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  user: User | null
  login: (email: string, password: string) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<AuthResult | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const storedRef = useRef<AuthResult | null>(null)
  storedRef.current = stored

  function persist(auth: AuthResult | null) {
    setStored(auth)
    if (auth) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setStored(JSON.parse(raw) as AuthResult)
        setStatus('authenticated')
      } else {
        setStatus('unauthenticated')
      }
    } catch {
      setStatus('unauthenticated')
    }
  }, [])

  useEffect(() => {
    configureApi({
      getAccessToken: () => storedRef.current?.accessToken ?? null,
      refreshAccessToken: async () => {
        const current = storedRef.current
        if (!current) return null
        try {
          const result = await apiFetch<AuthResult>('/auth/refresh', {
            method: 'POST',
            body: { refreshToken: current.refreshToken },
            auth: false,
          })
          persist(result)
          return result.accessToken
        } catch {
          return null
        }
      },
      logout: () => {
        persist(null)
        setStatus('unauthenticated')
      },
    })
  }, [])

  async function login(email: string, password: string): Promise<User> {
    const result = await apiFetch<AuthResult>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    })
    persist(result)
    setStatus('authenticated')
    return result.user
  }

  function logout() {
    const current = storedRef.current
    persist(null)
    setStatus('unauthenticated')
    if (current) {
      apiFetch('/auth/logout', {
        method: 'POST',
        auth: false,
        headers: { Authorization: `Bearer ${current.accessToken}` },
      }).catch(() => {
        // best-effort - tokens are already cleared locally
      })
    }
  }

  const value: AuthContextValue = {
    status,
    user: stored?.user ?? null,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/** Navigate to the landing page appropriate for the user's role. */
export function useGoHome() {
  const navigate = useNavigate()
  return (user: User) => {
    if (user.role === 'admin') {
      return navigate({ to: '/', replace: true })
    }
    return navigate({
      to: '/workflow/$contractorId',
      params: { contractorId: user.id },
      replace: true,
    })
  }
}
