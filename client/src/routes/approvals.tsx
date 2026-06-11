import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useLeads } from '#/lib/leads-store'
import { useContractors } from '#/lib/contractors'
import { type User } from '#/lib/auth-store'
import { type Lead } from '#/data/leads'
import { formatDate, formatDateTime } from '#/lib/format'
import StatusPill from '#/components/StatusPill'
import CriteriaChecklist from '#/components/CriteriaChecklist'
import LeadQueueList from '#/components/LeadQueueList'
import RequireAuth from '#/components/RequireAuth'

export const Route = createFileRoute('/approvals')({
  component: () => (
    <RequireAuth roles={['admin']}>
      <ApprovalsPage />
    </RequireAuth>
  ),
})

function ApprovalsPage() {
  const { leads, setAdminNotes, approveLead, sendBackToContractor, rejectLead } =
    useLeads()
  const { contractors } = useContractors()
  const queue = leads.filter((lead) => lead.status === 'pending_approval')
  const [selectedId, setSelectedId] = useState<string | null>(
    queue[0]?.id ?? null,
  )
  const selected =
    queue.find((lead) => lead.id === selectedId) ?? queue[0] ?? null

  return (
    <main className="page-wrap px-4 py-12">
      <section className="mb-6">
        <p className="island-kicker mb-2">Approvals</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Final Review
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
          Check the contractor's findings, then approve to move the lead to
          the completed pile and send the approval email.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="demo-panel">
          <h2 className="demo-section-title mb-3">
            Awaiting Approval ({queue.length})
          </h2>
          <LeadQueueList
            leads={queue}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            emptyMessage="No leads waiting on your review."
          />
        </div>

        <div className="demo-panel">
          {selected ? (
            <ApprovalDetail
              lead={selected}
              contractors={contractors}
              onAdminNotesChange={(notes) =>
                void setAdminNotes(selected.id, notes)
              }
              onApprove={() => void approveLead(selected.id)}
              onSendBack={() => void sendBackToContractor(selected.id)}
              onReject={() => void rejectLead(selected.id)}
            />
          ) : (
            <p className="demo-muted text-sm">
              Select a lead from the queue to review.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

function ApprovalDetail({
  lead,
  contractors,
  onAdminNotesChange,
  onApprove,
  onSendBack,
  onReject,
}: {
  lead: Lead
  contractors: Array<User>
  onAdminNotesChange: (notes: string) => void
  onApprove: () => void
  onSendBack: () => void
  onReject: () => void
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-xl font-bold text-[var(--sea-ink)]">
            {lead.name}
          </h2>
          {lead.company && (
            <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
              {lead.company}
            </p>
          )}
        </div>
        <StatusPill status={lead.status} />
      </div>

      <dl className="mb-5 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="island-kicker mb-1">Email</dt>
          <dd className="m-0 text-sm text-[var(--sea-ink)]">{lead.email}</dd>
        </div>
        <div>
          <dt className="island-kicker mb-1">Phone</dt>
          <dd className="m-0 text-sm text-[var(--sea-ink)]">{lead.phone}</dd>
        </div>
        <div>
          <dt className="island-kicker mb-1">Source</dt>
          <dd className="m-0 text-sm text-[var(--sea-ink)]">{lead.source}</dd>
        </div>
        <div>
          <dt className="island-kicker mb-1">Date Added</dt>
          <dd className="m-0 text-sm text-[var(--sea-ink)]">
            {formatDate(lead.dateAdded)}
          </dd>
        </div>
        <div>
          <dt className="island-kicker mb-1">Submitted By</dt>
          <dd className="m-0 text-sm text-[var(--sea-ink)]">
            {contractors.find(
              (contractor) => contractor.id === lead.assignedTo,
            )?.name ?? 'Unassigned'}
          </dd>
        </div>
      </dl>

      <div className="mb-5">
        <h3 className="demo-section-title mb-2">Contractor's Review</h3>
        <CriteriaChecklist criteria={lead.criteria} />
        {lead.contractorReviewedAt && (
          <p className="demo-muted mt-2 text-xs">
            Reviewed {formatDateTime(lead.contractorReviewedAt)}
          </p>
        )}
      </div>

      {lead.contractorNotes && (
        <div className="mb-5">
          <h3 className="demo-section-title mb-2">Contractor Notes</h3>
          <p className="demo-card m-0 text-sm text-[var(--sea-ink-soft)]">
            {lead.contractorNotes}
          </p>
        </div>
      )}

      <div className="mb-6">
        <h3 className="demo-section-title mb-2">Internal Notes</h3>
        <textarea
          className="demo-textarea"
          placeholder="Notes for our records..."
          value={lead.adminNotes}
          onChange={(event) => onAdminNotesChange(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="demo-button" onClick={onApprove}>
          Approve &amp; Send Email
        </button>
        <button
          type="button"
          className="demo-button demo-button-secondary"
          onClick={onSendBack}
        >
          Send Back to Contractor
        </button>
        <button
          type="button"
          className="demo-button demo-button-danger"
          onClick={onReject}
        >
          Reject
        </button>
      </div>
    </div>
  )
}
