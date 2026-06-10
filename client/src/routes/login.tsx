import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ApiError } from '#/lib/api'
import { useAuth, useGoHome } from '#/lib/auth-store'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const { status, user, login } = useAuth()
  const goHome = useGoHome()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && user) {
      void goHome(user)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user])

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

  if (status === 'authenticated') {
    return null
  }

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell mx-auto max-w-md rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">Sign In</p>
        <h1 className="display-title mb-3 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Welcome back
        </h1>
        <p className="mt-2 mb-6 text-sm text-[var(--sea-ink-soft)]">
          Sign in with your email and password to access the lead pipeline.
        </p>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <label
              htmlFor="email"
              className="island-kicker mb-1 block"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="demo-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="island-kicker mb-1 block"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="demo-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-[#9f3030]" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="demo-button"
            disabled={submitting}
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </section>
    </main>
  )
}
