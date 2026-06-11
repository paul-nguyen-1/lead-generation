import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { apiFetch, ApiError } from '#/lib/api'
import { useContractors } from '#/lib/contractors'
import RequireAuth from '#/components/RequireAuth'
import { Pill } from '#/components/StatusPill'

export const Route = createFileRoute('/contractors')({
  component: () => (
    <RequireAuth roles={['admin']}>
      <ContractorsPage />
    </RequireAuth>
  ),
})

function ContractorsPage() {
  const { contractors, loading, refetch } = useContractors()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggleActive(id: string, isActive: boolean) {
    setError(null)
    setUpdatingId(id)
    try {
      await apiFetch(`/users/${id}/status`, {
        method: 'PATCH',
        body: { isActive },
      })
      refetch()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <main className="page-wrap px-4 py-12">
      <section className="mb-6">
        <p className="island-kicker mb-2">Contractors</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Contractor Accounts
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
          Create new contractor accounts and manage access. Deactivating a
          contractor immediately revokes their ability to log in or refresh
          their session.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="demo-panel">
          <h2 className="demo-section-title mb-3">
            Contractors ({contractors.length})
          </h2>

          {error && (
            <p className="mb-3 text-sm text-[#9f3030]" role="alert">
              {error}
            </p>
          )}

          <div className="demo-table-shell">
            <table className="demo-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {contractors.map((contractor) => (
                  <tr key={contractor.id}>
                    <td className="font-semibold text-[var(--sea-ink)]">
                      {contractor.name}
                    </td>
                    <td className="text-sm text-[var(--sea-ink-soft)]">
                      {contractor.email}
                    </td>
                    <td>
                      {contractor.isActive ? (
                        <Pill label="Active" color="#16a34a" />
                      ) : (
                        <Pill label="Deactivated" color="#dc2626" />
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={
                          contractor.isActive
                            ? 'demo-button demo-button-danger'
                            : 'demo-button demo-button-secondary'
                        }
                        disabled={updatingId === contractor.id}
                        onClick={() =>
                          toggleActive(contractor.id, !contractor.isActive)
                        }
                      >
                        {contractor.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && contractors.length === 0 && (
              <p className="demo-muted p-4 text-sm">
                No contractor accounts yet.
              </p>
            )}
          </div>
        </div>

        <AddContractorForm onCreated={refetch} />
      </div>
    </main>
  )
}

function AddContractorForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: { name, email, password, role: 'contractor' },
      })
      setName('')
      setEmail('')
      setPassword('')
      setSuccess('Contractor account created.')
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Creation failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="demo-panel">
      <h2 className="demo-section-title mb-3">Add Contractor</h2>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div>
          <label htmlFor="contractor-name" className="island-kicker mb-1 block">
            Name
          </label>
          <input
            id="contractor-name"
            type="text"
            required
            className="demo-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="contractor-email" className="island-kicker mb-1 block">
            Email
          </label>
          <input
            id="contractor-email"
            type="email"
            required
            autoComplete="off"
            className="demo-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="contractor-password" className="island-kicker mb-1 block">
            Temporary Password
          </label>
          <input
            id="contractor-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
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
        {success && (
          <p className="text-sm text-[#16a34a]" role="status">
            {success}
          </p>
        )}

        <button type="submit" className="demo-button" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create Contractor'}
        </button>
      </form>
    </div>
  )
}
