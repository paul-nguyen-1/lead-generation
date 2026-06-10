import { useEffect, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth, useGoHome, type Role, type User } from '#/lib/auth-store'

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <main className="page-wrap px-4 py-12">
      <p className="demo-muted text-sm">{children}</p>
    </main>
  )
}

export default function RequireAuth({
  roles,
  allow,
  children,
}: {
  roles?: Array<Role>
  allow?: (user: User) => boolean
  children: ReactNode
}) {
  const { status, user } = useAuth()
  const navigate = useNavigate()
  const goHome = useGoHome()

  const isAllowed =
    !!user &&
    (!roles || roles.includes(user.role)) &&
    (!allow || allow(user))

  useEffect(() => {
    if (status === 'unauthenticated') {
      void navigate({ to: '/login', replace: true })
    } else if (status === 'authenticated' && user && !isAllowed) {
      void goHome(user)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user, isAllowed])

  if (status === 'loading') {
    return <CenteredMessage>Loading…</CenteredMessage>
  }

  if (status === 'unauthenticated' || !user || !isAllowed) {
    return <CenteredMessage>Redirecting…</CenteredMessage>
  }

  return <>{children}</>
}
