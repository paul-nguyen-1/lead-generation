import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { apiFetch, ApiError } from '#/lib/api'
import { useContractors } from '#/lib/contractors'
import { useContractorAnalytics } from '#/lib/contractor-analytics'
import { type User } from '#/lib/auth-store'
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
  const { contractors: analytics } = useContractorAnalytics()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [managingContractor, setManagingContractor] = useState<User | null>(null)

  function getStats(contractorId: string) {
    return analytics.find((a) => a.id === contractorId)
  }

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

          <div className="divide-y divide-(--line)">
            {contractors.map((contractor) => {
              const stats = getStats(contractor.id)
              return (
                <div
                  key={contractor.id}
                  className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0"
                >
                  <div className="shrink-0 text-center" style={{ width: '2.75rem' }}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-(--lagoon) text-sm font-bold text-white">
                      {contractor.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="mt-1 truncate text-[10px] font-medium text-(--sea-ink-soft)">
                      {contractor.name.split(' ')[0]}
                    </p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {contractor.isActive ? (
                        <Pill label="Active" color="#16a34a" />
                      ) : (
                        <Pill label="Deactivated" color="#dc2626" />
                      )}
                      {contractor.permissions?.leadsAccess && (
                        <Pill label="Leads" color="#2563eb" />
                      )}
                      {contractor.permissions?.draftEmailAccess && (
                        <Pill label="Draft Email" color="#7c3aed" />
                      )}
                      {!contractor.permissions?.leadsAccess &&
                        !contractor.permissions?.draftEmailAccess && (
                          <span className="text-xs text-(--sea-ink-soft)">No permissions</span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-(--sea-ink-soft)">{contractor.email}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-(--sea-ink-soft)">
                      <span>
                        <strong className="text-(--sea-ink)">{stats?.totalLeads ?? 0}</strong> leads
                      </span>
                      <span>
                        <strong className="text-(--sea-ink)">{stats?.draftLeads ?? 0}</strong> drafts
                      </span>
                      <span>
                        <strong className="text-(--sea-ink)">{stats?.completedLeads ?? 0}</strong> approved
                      </span>
                      <span>
                        <strong className="text-(--sea-ink)">{stats?.rejectedLeads ?? 0}</strong> rejected
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      type="button"
                      className="demo-button demo-button-secondary"
                      onClick={() => setManagingContractor(contractor)}
                    >
                      Manage Access
                    </button>
                    <button
                      type="button"
                      className={
                        contractor.isActive
                          ? 'demo-button demo-button-danger'
                          : 'demo-button demo-button-secondary'
                      }
                      disabled={updatingId === contractor.id}
                      onClick={() =>
                        void toggleActive(contractor.id, !contractor.isActive)
                      }
                    >
                      {updatingId === contractor.id
                        ? '…'
                        : contractor.isActive
                          ? 'Deactivate'
                          : 'Activate'}
                    </button>
                  </div>
                </div>
              )
            })}
            {!loading && contractors.length === 0 && (
              <p className="demo-muted py-4 text-sm">
                No contractor accounts yet.
              </p>
            )}
          </div>
        </div>

        <AddContractorForm onCreated={refetch} />
      </div>

      {managingContractor && (
        <PermissionsModal
          contractor={managingContractor}
          onClose={() => setManagingContractor(null)}
          onSaved={() => {
            setManagingContractor(null)
            refetch()
          }}
        />
      )}
    </main>
  )
}

function PermissionsModal({
  contractor,
  onClose,
  onSaved,
}: {
  contractor: User
  onClose: () => void
  onSaved: () => void
}) {
  const [leadsAccess, setLeadsAccess] = useState(
    contractor.permissions?.leadsAccess ?? false,
  )
  const [draftEmailAccess, setDraftEmailAccess] = useState(
    contractor.permissions?.draftEmailAccess ?? false,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      await apiFetch(`/users/${contractor.id}/permissions`, {
        method: 'PATCH',
        body: { leadsAccess, draftEmailAccess },
      })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="island-shell w-full max-w-sm rounded-2xl p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-bold text-[var(--sea-ink)]">
          Manage Access
        </h2>
        <p className="mb-5 text-sm text-[var(--sea-ink-soft)]">
          {contractor.name} &mdash; {contractor.email}
        </p>

        <div className="mb-5 flex flex-col gap-4">
          <ToggleRow
            label="Leads Access"
            description="Can log leads, review criteria, and submit for approval."
            checked={leadsAccess}
            onChange={setLeadsAccess}
          />
          <ToggleRow
            label="Draft Email Access"
            description="Can compose outreach email drafts for admin to review and send."
            checked={draftEmailAccess}
            onChange={setDraftEmailAccess}
          />
        </div>

        {error && (
          <p className="mb-3 text-sm text-[#9f3030]" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            className="demo-button"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="demo-button demo-button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={[
            'h-5 w-9 rounded-full transition-colors',
            checked ? 'bg-(--lagoon)' : 'bg-(--line)',
          ].join(' ')}
        />
        <div
          className={[
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          ].join(' ')}
        />
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--sea-ink)]">{label}</p>
        <p className="text-xs text-[var(--sea-ink-soft)]">{description}</p>
      </div>
    </label>
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
      <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
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
