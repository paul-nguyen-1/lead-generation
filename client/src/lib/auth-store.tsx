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

export interface ContractorPermissions {
  leadsAccess: boolean
  draftEmailAccess: boolean
}

export interface User {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
  permissions: ContractorPermissions
}

// Only tokens are persisted — user is always fetched from the DB so
// permissions are never stale.
interface StoredTokens {
  accessToken: string
  refreshToken: string
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
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const tokensRef = useRef<StoredTokens | null>(null)

  function persistTokens(tokens: StoredTokens | null) {
    tokensRef.current = tokens
    if (tokens) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  useEffect(() => {
    // Restore tokens synchronously so the API hooks have them immediately.
    let tokens: StoredTokens | null = null
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) tokens = JSON.parse(raw) as StoredTokens
    } catch { /* ignore */ }

    if (tokens) tokensRef.current = tokens

    configureApi({
      getAccessToken: () => tokensRef.current?.accessToken ?? null,
      refreshAccessToken: async () => {
        const current = tokensRef.current
        if (!current) return null
        try {
          const result = await apiFetch<StoredTokens & { user: User }>(
            '/auth/refresh',
            {
              method: 'POST',
              body: { refreshToken: current.refreshToken },
              auth: false,
            },
          )
          persistTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken })
          setUser(result.user)
          return result.accessToken
        } catch {
          return null
        }
      },
      logout: () => {
        persistTokens(null)
        setUser(null)
        setStatus('unauthenticated')
      },
    })

    if (!tokens) {
      setStatus('unauthenticated')
      return
    }

    // Always pull user from DB — permissions always reflect current DB state.
    apiFetch<User>('/auth/me')
      .then((freshUser) => {
        setUser(freshUser)
        setStatus('authenticated')
      })
      .catch(() => {
        persistTokens(null)
        setStatus('unauthenticated')
      })
  }, [])

  async function login(email: string, password: string): Promise<User> {
    const result = await apiFetch<StoredTokens & { user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    })
    persistTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken })
    setUser(result.user)
    setStatus('authenticated')
    return result.user
  }

  function logout() {
    const token = tokensRef.current?.accessToken
    persistTokens(null)
    setUser(null)
    setStatus('unauthenticated')
    if (token) {
      apiFetch('/auth/logout', {
        method: 'POST',
        auth: false,
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
  }

  const value: AuthContextValue = { status, user, login, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export function useGoHome() {
  const navigate = useNavigate()
  return (user: User) => {
    if (user.role === 'admin') return navigate({ to: '/', replace: true })
    return navigate({
      to: '/workflow/$contractorId',
      params: { contractorId: user.id },
      replace: true,
    })
  }
}
