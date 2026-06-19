import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useLeads } from '#/lib/leads-store'
import { useContractors } from '#/lib/contractors'
import { type User } from '#/lib/auth-store'
import { type Lead } from '#/data/leads'
import { apiFetch, ApiError } from '#/lib/api'
import RequireAuth from '#/components/RequireAuth'
import Skeleton, { TableSkeleton } from '#/components/Skeleton'

export const Route = createFileRoute('/drafts')({
  component: () => (
    <RequireAuth roles={['admin']}>
      <DraftsPage />
    </RequireAuth>
  ),
})

function DraftsPage() {
  const { leads, loading: leadsLoading, refetch } = useLeads()
  const { contractors, loading: contractorsLoading } = useContractors()
  const loading = leadsLoading || contractorsLoading
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Contractors eligible for drafting (both permissions, active)
  const eligibleDrafters = contractors.filter(
    (c) => c.permissions?.leadsAccess && c.permissions?.draftEmailAccess && c.isActive,
  )

  const eligibleDrafterIds = new Set(eligibleDrafters.map((c) => c.id))

  // Leads that need draft assignment: not yet drafted, not done,
  // and NOT already assigned to someone who can draft their own email
  const draftQueue = leads.filter(
    (lead) =>
      lead.emailStatus === 'not_sent' &&
      lead.status !== 'completed' &&
      lead.status !== 'rejected' &&
      !eligibleDrafterIds.has(lead.assignedTo),
  )

  async function handleAutoAssign(leadId: string) {
    setError(null)
    setSuccess(null)
    setAssigning(true)
    try {
      await apiFetch(`/leads/${leadId}/auto-assign-draft`, {
        method: 'PATCH',
      })
      setSuccess('Lead auto-assigned to the contractor with the fewest leads.')
      refetch()
      if (selectedLead?.id === leadId) setSelectedLead(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Auto-assign failed')
    } finally {
      setAssigning(false)
    }
  }

  async function handleManualAssign(leadId: string, contractorId: string) {
    setError(null)
    setSuccess(null)
    setAssigning(true)
    try {
      await apiFetch(`/leads/${leadId}/assign`, {
        method: 'PATCH',
        body: { userId: contractorId },
      })
      setSuccess('Lead manually assigned.')
      refetch()
      if (selectedLead?.id === leadId) setSelectedLead(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Manual assign failed')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-12">
      <section className="mb-6">
        <p className="island-kicker mb-2">Draft Assignment</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Drafts Queue
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
          Assign leads from the queue to contractors for email drafting. Auto-assign
          picks the eligible contractor with the fewest current leads.
        </p>
      </section>

      {(error || success) && (
        <div className="mb-4">
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
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left — queue */}
        <div className="demo-panel">
          <h2 className="demo-section-title mb-3">
            Unassigned Queue ({draftQueue.length})
          </h2>
          {loading ? (
            <TableSkeleton columns={4} rows={4} />
          ) : draftQueue.length === 0 ? (
            <p className="demo-muted p-4 text-sm">
              No leads pending draft assignment.
            </p>
          ) : (
            <div className="demo-table-shell">
              <table className="demo-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {draftQueue.map((lead) => (
                    <tr
                      key={lead.id}
                      className={
                        selectedLead?.id === lead.id
                          ? 'bg-[var(--chip-bg)]'
                          : ''
                      }
                    >
                      <td className="font-semibold text-[var(--sea-ink)]">
                        {lead.name}
                      </td>
                      <td className="text-sm text-[var(--sea-ink-soft)]">
                        {lead.email || '—'}
                      </td>
                      <td className="text-sm text-[var(--sea-ink-soft)]">
                        {lead.status}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="demo-button"
                            disabled={assigning}
                            onClick={() => void handleAutoAssign(lead.id)}
                          >
                            Auto-assign
                          </button>
                          <button
                            type="button"
                            className="demo-button demo-button-secondary"
                            onClick={() =>
                              setSelectedLead(
                                selectedLead?.id === lead.id ? null : lead,
                              )
                            }
                          >
                            Manual
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right — assignment panel */}
        <div className="demo-panel">
          {loading ? (
            <DraftersPanelSkeleton />
          ) : selectedLead ? (
            <ManualAssignPanel
              lead={selectedLead}
              contractors={contractors}
              eligibleDrafters={eligibleDrafters}
              assigning={assigning}
              onAssign={(contractorId) =>
                void handleManualAssign(selectedLead.id, contractorId)
              }
              onCancel={() => setSelectedLead(null)}
            />
          ) : (
            <EligibleDraftersPanel drafters={eligibleDrafters} />
          )}
        </div>
      </div>
    </main>
  )
}

function DraftersPanelSkeleton() {
  return (
    <div>
      <Skeleton className="mb-3 h-5 w-44" />
      <Skeleton className="mb-1.5 h-3 w-full" />
      <Skeleton className="mb-4 h-3 w-2/3" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

function EligibleDraftersPanel({ drafters }: { drafters: Array<User> }) {
  return (
    <>
      <h2 className="demo-section-title mb-3">
        Auto-assign Eligible ({drafters.length})
      </h2>
      <p className="mb-4 text-xs text-[var(--sea-ink-soft)]">
        These contractors have both Leads Access and Draft Email Access enabled.
        Auto-assign will pick whichever has the fewest current leads.
      </p>
      {drafters.length === 0 ? (
        <p className="demo-muted text-sm">
          No contractors are currently eligible. Grant both Leads and Draft Email
          access on the Contractors page.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {drafters.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            >
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#16a34a]" />
              <span className="font-semibold text-[var(--sea-ink)]">
                {c.name}
              </span>
              <span className="text-[var(--sea-ink-soft)]">{c.email}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function ManualAssignPanel({
  lead,
  contractors,
  eligibleDrafters,
  assigning,
  onAssign,
  onCancel,
}: {
  lead: Lead
  contractors: Array<User>
  eligibleDrafters: Array<User>
  assigning: boolean
  onAssign: (contractorId: string) => void
  onCancel: () => void
}) {
  const [selectedId, setSelectedId] = useState(
    eligibleDrafters[0]?.id ?? contractors[0]?.id ?? '',
  )

  return (
    <>
      <h2 className="demo-section-title mb-1">Manual Assign</h2>
      <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
        Assigning: <strong>{lead.name}</strong>
      </p>

      <label htmlFor="contractor-select" className="island-kicker mb-1 block">
        Contractor
      </label>
      <select
        id="contractor-select"
        className="demo-input mb-4"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        {contractors.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {eligibleDrafters.some((d) => d.id === c.id) ? ' ✓' : ''}
          </option>
        ))}
      </select>

      <div className="flex gap-3">
        <button
          type="button"
          className="demo-button"
          disabled={assigning || !selectedId}
          onClick={() => onAssign(selectedId)}
        >
          {assigning ? 'Assigning…' : 'Assign'}
        </button>
        <button
          type="button"
          className="demo-button demo-button-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>

      {eligibleDrafters.length > 0 && (
        <p className="mt-4 text-xs text-[var(--sea-ink-soft)]">
          Contractors marked with ✓ have full draft email access.
        </p>
      )}
    </>
  )
}
