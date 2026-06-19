import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useLeads } from '#/lib/leads-store'
import { useContractors } from '#/lib/contractors'
import { apiFetch } from '#/lib/api'
import { useEffect } from 'react'
import { formatDate, formatDateTime } from '#/lib/format'
import { Pill } from '#/components/StatusPill'
import RequireAuth from '#/components/RequireAuth'
import { LeadDetailHeader, LeadFieldsGrid, LeadNotes } from '#/components/LeadDetailFields'
import type { Lead } from '#/data/leads'
import type { User } from '#/lib/auth-store'

export const Route = createFileRoute('/completed')({
  component: () => (
    <RequireAuth roles={['admin']}>
      <CompletedPage />
    </RequireAuth>
  ),
})

function CompletedPage() {
  const { leads } = useLeads()
  const { contractors } = useContractors()
  const [admins, setAdmins] = useState<Array<User>>([])
  const approved = leads.filter((lead) => lead.status === 'completed')
  const rejected = leads.filter((lead) => lead.status === 'rejected')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected =
    [...approved, ...rejected].find((lead) => lead.id === selectedId) ?? null

  useEffect(() => {
    apiFetch<Array<User>>('/users?role=admin')
      .then(setAdmins)
      .catch(() => {})
  }, [])

  const allUsers = [...contractors, ...admins]

  function userName(id: string | null) {
    if (!id) return null
    return allUsers.find((u) => u.id === id)?.name ?? null
  }

  return (
    <main className="page-wrap px-4 py-12">
      <section className="mb-6">
        <p className="island-kicker mb-2">Completed</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Completed Pile
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
          Leads that have finished the review pipeline, including approval
          emails sent to the team. Select a lead to view its full review
          history.
        </p>
      </section>

      <section className="island-shell mb-6 rounded-2xl p-6">
        <h2 className="m-0 mb-3 text-lg font-bold text-[var(--sea-ink)]">
          Approved ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <p className="demo-muted text-sm">No approved leads yet.</p>
        ) : (
          <div className="demo-table-shell">
            <table className="demo-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Internal Notes</th>
                  <th>Approved</th>
                  <th>Email</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {approved.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <p className="m-0 font-semibold text-[var(--sea-ink)]">
                        {lead.name}
                      </p>
                      {lead.company && (
                        <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
                          {lead.company}
                        </p>
                      )}
                    </td>
                    <td className="text-sm text-[var(--sea-ink-soft)]">
                      {lead.adminNotes || '—'}
                    </td>
                    <td className="text-sm text-[var(--sea-ink-soft)]">
                      {lead.adminReviewedAt
                        ? formatDateTime(lead.adminReviewedAt)
                        : '—'}
                    </td>
                    <td>
                      {lead.emailStatus === 'sent' && lead.emailSentAt ? (
                        <Pill
                          label={`Sent ${formatDate(lead.emailSentAt)}`}
                          color="#16a34a"
                        />
                      ) : (
                        <Pill label="Not sent" color="#64748b" />
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="demo-button demo-button-secondary"
                        onClick={() => setSelectedId(lead.id)}
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="island-shell mb-6 rounded-2xl p-6">
        <h2 className="m-0 mb-3 text-lg font-bold text-[var(--sea-ink)]">
          Rejected ({rejected.length})
        </h2>
        {rejected.length === 0 ? (
          <p className="demo-muted text-sm">No rejected leads.</p>
        ) : (
          <div className="demo-table-shell">
            <table className="demo-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Reason</th>
                  <th>Reviewed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rejected.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <p className="m-0 font-semibold text-[var(--sea-ink)]">
                        {lead.name}
                      </p>
                      {lead.company && (
                        <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
                          {lead.company}
                        </p>
                      )}
                    </td>
                    <td className="text-sm text-[var(--sea-ink-soft)]">
                      {lead.adminNotes || '—'}
                    </td>
                    <td className="text-sm text-[var(--sea-ink-soft)]">
                      {lead.adminReviewedAt
                        ? formatDateTime(lead.adminReviewedAt)
                        : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="demo-button demo-button-secondary"
                        onClick={() => setSelectedId(lead.id)}
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <section className="island-shell rounded-2xl p-6">
          <LeadHistory
            lead={selected}
            loggedByName={userName(selected.createdBy) ?? 'Unknown'}
            reviewedByName={userName(selected.assignedTo) ?? 'Unknown'}
            approvedByName={userName(selected.approvedBy) ?? null}
            onClose={() => setSelectedId(null)}
          />
        </section>
      )}
    </main>
  )
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <li className="demo-list-item flex items-center justify-between gap-3 text-sm text-[var(--sea-ink)]">
      <span>{label}</span>
      <span className="text-[var(--sea-ink-soft)]">{value}</span>
    </li>
  )
}

function LeadHistory({
  lead,
  loggedByName,
  reviewedByName,
  approvedByName,
  onClose,
}: {
  lead: Lead
  loggedByName: string
  reviewedByName: string
  approvedByName: string | null
  onClose: () => void
}) {
  const decisionLabel =
    lead.adminDecision === 'approved' ? 'Approved' : 'Rejected'

  return (
    <div>
      <LeadDetailHeader
        lead={lead}
        right={
          <button
            type="button"
            className="demo-button demo-button-secondary"
            onClick={onClose}
          >
            Close
          </button>
        }
      />

      <LeadFieldsGrid lead={lead} trailing={[{ label: 'Logged By', value: loggedByName }]} />

      <LeadNotes notes={lead.notes} />

      <div className="mb-5">
        <h3 className="demo-section-title mb-2">Timeline</h3>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          <TimelineItem
            label={`Logged by ${loggedByName}`}
            value={formatDateTime(lead.dateAdded)}
          />
          <TimelineItem
            label={`Contractor Review by ${reviewedByName}`}
            value={
              lead.contractorReviewedAt
                ? formatDateTime(lead.contractorReviewedAt)
                : '—'
            }
          />
          <TimelineItem
            label={`${decisionLabel} by ${approvedByName ?? 'Admin'}`}
            value={
              lead.adminReviewedAt
                ? formatDateTime(lead.adminReviewedAt)
                : '—'
            }
          />
          <TimelineItem
            label="Approval Email Sent"
            value={
              lead.emailStatus === 'sent' && lead.emailSentAt
                ? formatDateTime(lead.emailSentAt)
                : 'Not sent'
            }
          />
        </ul>
      </div>

      <div>
        <h3 className="demo-section-title mb-2">Internal Notes</h3>
        <p className="demo-card m-0 text-sm text-[var(--sea-ink-soft)]">
          {lead.adminNotes || 'No notes yet.'}
        </p>
      </div>
    </div>
  )
}
