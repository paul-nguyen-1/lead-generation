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
  const { leads, setAdminNotes, saveDraftEmail, approveLead, sendBackToContractor, rejectLead } =
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
          Review the contractor's findings and edit the draft outreach email.
          Approving will send the email automatically via SMTP.
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
              onSaveDraftEmail={(subject, body) =>
                void saveDraftEmail(selected.id, subject, body)
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
  onSaveDraftEmail,
  onApprove,
  onSendBack,
  onReject,
}: {
  lead: Lead
  contractors: Array<User>
  onAdminNotesChange: (notes: string) => void
  onSaveDraftEmail: (subject: string, body: string) => void
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
          <dd className="m-0 text-sm text-[var(--sea-ink)]">{lead.email || '—'}</dd>
        </div>
        <div>
          <dt className="island-kicker mb-1">Phone</dt>
          <dd className="m-0 text-sm text-[var(--sea-ink)]">{lead.phone || '—'}</dd>
        </div>
        <div>
          <dt className="island-kicker mb-1">Source</dt>
          <dd className="m-0 text-sm text-[var(--sea-ink)]">{lead.source || '—'}</dd>
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

      <div className="mb-5">
        <h3 className="demo-section-title mb-2">Internal Notes</h3>
        <textarea
          className="demo-textarea"
          placeholder="Notes for our records..."
          value={lead.adminNotes}
          onChange={(event) => onAdminNotesChange(event.target.value)}
        />
      </div>

      <DraftEmailEditor
        lead={lead}
        onSave={onSaveDraftEmail}
      />

      <div className="mt-6 flex flex-wrap gap-3">
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

function DraftEmailEditor({
  lead,
  onSave,
}: {
  lead: Lead
  onSave: (subject: string, body: string) => void
}) {
  const [subject, setSubject] = useState(lead.draftEmailSubject)
  const [body, setBody] = useState(lead.draftEmailBody)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!subject.trim()) {
      setError('Subject is required.')
      return
    }
    if (!body.trim()) {
      setError('Body is required.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      onSave(subject, body)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const hasDraft = lead.emailStatus === 'draft' || !!lead.draftEmailSubject

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--sand)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="demo-section-title m-0">Outreach Email</h3>
        {hasDraft && (
          <span className="rounded-full bg-[var(--lagoon)] px-2.5 py-0.5 text-xs font-semibold text-white">
            Draft
          </span>
        )}
      </div>

      {lead.draftEmailCreatedAt && (
        <p className="mb-3 text-xs text-[var(--sea-ink-soft)]">
          Draft submitted {formatDateTime(lead.draftEmailCreatedAt)} &mdash; edit
          below before approving.
        </p>
      )}

      {!hasDraft && (
        <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">
          No draft yet. You can compose one here or approve without an email.
        </p>
      )}

      <div className="mb-3">
        <label
          htmlFor="approval-email-to"
          className="island-kicker mb-1 block"
        >
          To
        </label>
        <input
          id="approval-email-to"
          type="text"
          className="demo-input"
          value={lead.email || '(no email on file)'}
          readOnly
        />
      </div>

      <div className="mb-3">
        <label
          htmlFor="approval-email-subject"
          className="island-kicker mb-1 block"
        >
          Subject
        </label>
        <input
          id="approval-email-subject"
          type="text"
          className="demo-input"
          placeholder="Email subject…"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label
          htmlFor="approval-email-body"
          className="island-kicker mb-1 block"
        >
          Message
        </label>
        <textarea
          id="approval-email-body"
          className="demo-textarea min-h-[180px]"
          placeholder="Email body…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      {error && (
        <p className="mb-2 text-sm text-[#9f3030]" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="demo-button demo-button-secondary"
        onClick={() => void handleSave()}
        disabled={saving}
      >
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Email Draft'}
      </button>
    </div>
  )
}
