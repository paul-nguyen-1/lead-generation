import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ApiError } from '#/lib/api'
import { useAuth, useGoHome } from '#/lib/auth-store'

export const Route = createFileRoute('/login')({ component: LoginPage })

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type Tab = 'sign-in' | 'change-password'

function LoginPage() {
  const { status, user } = useAuth()
  const goHome = useGoHome()
  const [tab, setTab] = useState<Tab>('sign-in')

  useEffect(() => {
    if (status === 'authenticated' && user) {
      void goHome(user)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user])

  if (status === 'authenticated') return null

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell mx-auto max-w-md rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">Account</p>
        <h1 className="display-title mb-6 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Lead Pipeline
        </h1>

        <div className="mb-6 flex gap-1 border-b border-[var(--line)]">
          <TabButton active={tab === 'sign-in'} onClick={() => setTab('sign-in')}>
            Sign In
          </TabButton>
          <TabButton active={tab === 'change-password'} onClick={() => setTab('change-password')}>
            Change Password
          </TabButton>
        </div>

        {tab === 'sign-in' ? <SignInForm /> : <ChangePasswordForm />}
      </section>
    </main>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-t-lg px-5 py-2.5 text-sm font-semibold transition-colors',
        active
          ? 'border-b-2 border-[var(--lagoon)] text-[var(--lagoon-deep)]'
          : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function SignInForm() {
  const { login } = useAuth()
  const goHome = useGoHome()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const loggedInUser = await login(email, password)
      await goHome(loggedInUser)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
      <div>
        <label htmlFor="email" className="island-kicker mb-1 block">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="demo-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="password" className="island-kicker mb-1 block">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          className="demo-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-[#9f3030]" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="demo-button" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}

function ChangePasswordForm() {
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      // Authenticate first to get an access token
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: currentPassword }),
      })
      if (!loginRes.ok) {
        const data = (await loginRes.json()) as { message?: string }
        throw new Error(data.message ?? 'Invalid email or password')
      }
      const { accessToken } = (await loginRes.json()) as { accessToken: string }

      // Change the password using that token
      const changeRes = await fetch(`${API_URL}/auth/change-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (!changeRes.ok) {
        const data = (await changeRes.json()) as { message?: string }
        throw new Error(data.message ?? 'Failed to change password')
      }

      // Invalidate the temporary session immediately
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {})

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-[#16a34a]">
          Password updated. Sign in with your new password.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
      <p className="text-sm text-[var(--sea-ink-soft)]">
        Enter your account email, your current (temporary) password, and the
        new password you'd like to use.
      </p>

      <div>
        <label htmlFor="cp-email" className="island-kicker mb-1 block">
          Email
        </label>
        <input
          id="cp-email"
          type="email"
          required
          autoComplete="email"
          className="demo-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="cp-current" className="island-kicker mb-1 block">
          Current Password
        </label>
        <input
          id="cp-current"
          type="password"
          required
          autoComplete="current-password"
          className="demo-input"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="cp-new" className="island-kicker mb-1 block">
          New Password
        </label>
        <input
          id="cp-new"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="demo-input"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="cp-confirm" className="island-kicker mb-1 block">
          Confirm New Password
        </label>
        <input
          id="cp-confirm"
          type="password"
          required
          autoComplete="new-password"
          className="demo-input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-[#9f3030]" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="demo-button" disabled={submitting}>
        {submitting ? 'Updating…' : 'Update Password'}
      </button>
    </form>
  )
}
