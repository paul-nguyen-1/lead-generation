import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useLeads } from '#/lib/leads-store'
import { useAuth } from '#/lib/auth-store'
import { useContractors } from '#/lib/contractors'
import RequireAuth from '#/components/RequireAuth'
import { type Lead } from '#/data/leads'
import { formatDate } from '#/lib/format'
import StatusPill from '#/components/StatusPill'
import CriteriaChecklist from '#/components/CriteriaChecklist'
import LeadQueueList from '#/components/LeadQueueList'

export const Route = createFileRoute('/workflow/$contractorId')({
  component: () => {
    const { contractorId } = Route.useParams()
    return (
      <RequireAuth
        allow={(user) => user.role === 'admin' || user.id === contractorId}
      >
        <ContractorWorkflowPage />
      </RequireAuth>
    )
  },
})

function ContractorWorkflowPage() {
  const { contractorId } = Route.useParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const { contractors } = useContractors({ enabled: isAdmin })
  const contractorName = isAdmin
    ? (contractors.find((c) => c.id === contractorId)?.name ?? 'Contractor')
    : (user?.name ?? 'Contractor')
  const {
    leads,
    toggleCriterion,
    setContractorNotes,
    submitForApproval,
    rejectLead,
  } = useLeads()
  const queue = leads.filter(
    (lead) =>
      lead.assignedTo === contractorId &&
      (lead.status === 'new' || lead.status === 'contractor_review'),
  )
  const [selectedId, setSelectedId] = useState<string | null>(
    queue[0]?.id ?? null,
  )
  const selected =
    queue.find((lead) => lead.id === selectedId) ?? queue[0] ?? null

  return (
    <main className="page-wrap px-4 py-12">
      <section className="mb-6">
        <Link to="/workflow" className="nav-link text-sm">
          &larr; All Contractors
        </Link>
        <p className="island-kicker mb-2 mt-3">Workflow</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          {contractorName} &mdash; Queue
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
          Review each lead against our criteria, leave notes for the team,
          then submit it for approval.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="demo-panel">
          <h2 className="demo-section-title mb-3">Queue ({queue.length})</h2>
          <LeadQueueList
            leads={queue}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            emptyMessage="No leads waiting on this contractor."
          />
        </div>

        <div className="demo-panel">
          {selected ? (
            <LeadReviewDetail
              lead={selected}
              onToggleCriterion={(criterionId) =>
                void toggleCriterion(selected.id, criterionId)
              }
              onNotesChange={(notes) =>
                void setContractorNotes(selected.id, notes)
              }
              onSubmit={() => void submitForApproval(selected.id)}
              onReject={() => void rejectLead(selected.id)}
            />
          ) : (
            <p className="demo-muted text-sm">
              Select a lead from the queue to begin reviewing.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

function LeadReviewDetail({
  lead,
  onToggleCriterion,
  onNotesChange,
  onSubmit,
  onReject,
}: {
  lead: Lead
  onToggleCriterion: (criterionId: string) => void
  onNotesChange: (notes: string) => void
  onSubmit: () => void
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
      </dl>

      {lead.notes && (
        <div className="mb-5">
          <h3 className="demo-section-title mb-2">Lead Details</h3>
          <p className="demo-card m-0 text-sm text-[var(--sea-ink-soft)]">
            {lead.notes}
          </p>
        </div>
      )}

      <div className="mb-5">
        <h3 className="demo-section-title mb-2">Review Criteria</h3>
        <CriteriaChecklist
          criteria={lead.criteria}
          editable
          onToggle={onToggleCriterion}
        />
      </div>

      <div className="mb-6">
        <h3 className="demo-section-title mb-2">Your Notes</h3>
        <textarea
          className="demo-textarea"
          placeholder="Add context for the review team..."
          value={lead.contractorNotes}
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="demo-button" onClick={onSubmit}>
          Submit for Approval
        </button>
        <button
          type="button"
          className="demo-button demo-button-danger"
          onClick={onReject}
        >
          Reject Lead
        </button>
      </div>
    </div>
  )
}
