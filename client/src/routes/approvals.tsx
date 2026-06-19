import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useLeads } from '#/lib/leads-store'
import { useContractors } from '#/lib/contractors'
import { useAuth, type User } from '#/lib/auth-store'
import { type Lead } from '#/data/leads'
import { formatDate, formatDateTime } from '#/lib/format'
import StatusPill from '#/components/StatusPill'
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
  const { leads, saveDraftEmail, approveLead, sendBackToContractor, rejectLead } =
    useLeads()
  const { contractors } = useContractors()
  const { user } = useAuth()
  const queue = leads.filter((lead) => lead.status === 'pending_approval')
  const [selectedId, setSelectedId] = useState<string | null>(
    queue[0]?.id ?? null,
  )
  const selected =
    queue.find((lead) => lead.id === selectedId) ?? queue[0] ?? null
  const [pendingApprovalLead, setPendingApprovalLead] = useState<Lead | null>(null)
  const [sendBackLead, setSendBackLead] = useState<Lead | null>(null)

  return (
    <main className="page-wrap px-4 py-12">
      <section className="mb-6">
        <p className="island-kicker mb-2">Approvals</p>
        <h1 className="display-title text-3xl font-bold text-(--sea-ink) sm:text-4xl">
          Final Review
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-(--sea-ink-soft)">
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
              onApprove={(subject, body) =>
                void saveDraftEmail(selected.id, subject, body).then(() =>
                  setPendingApprovalLead(selected),
                )
              }
              onSendBack={() => setSendBackLead(selected)}
              onReject={() => void rejectLead(selected.id)}
            />
          ) : (
            <p className="demo-muted text-sm">
              Select a lead from the queue to review.
            </p>
          )}
        </div>
      </div>

      {pendingApprovalLead && (
        <ApproveConfirmModal
          lead={pendingApprovalLead}
          adminName={user?.name ?? 'Admin'}
          onConfirm={() => {
            void approveLead(pendingApprovalLead.id)
            setPendingApprovalLead(null)
          }}
          onCancel={() => setPendingApprovalLead(null)}
        />
      )}

      {sendBackLead && (
        <SendBackModal
          lead={sendBackLead}
          onConfirm={(message) => {
            void sendBackToContractor(sendBackLead.id, message)
            setSendBackLead(null)
          }}
          onCancel={() => setSendBackLead(null)}
        />
      )}
    </main>
  )
}

function ApprovalDetail({
  lead,
  contractors,
  onApprove,
  onSendBack,
  onReject,
}: {
  lead: Lead
  contractors: Array<User>
  onApprove: (subject: string, body: string) => void
  onSendBack: () => void
  onReject: () => void
}) {
  const [emailSubject, setEmailSubject] = useState(lead.draftEmailSubject)
  const [emailBody, setEmailBody] = useState(lead.draftEmailBody)

  useEffect(() => {
    setEmailSubject(lead.draftEmailSubject)
    setEmailBody(lead.draftEmailBody)
  }, [lead.id])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-xl font-bold text-(--sea-ink)">
            {lead.name}
          </h2>
          {lead.company && (
            <p className="m-0 text-sm text-(--sea-ink-soft)">
              {lead.company}
            </p>
          )}
        </div>
        <StatusPill status={lead.status} />
      </div>

      <dl className="mb-5 grid gap-3 sm:grid-cols-2">
        {lead.jobTitle && (
          <div>
            <dt className="island-kicker mb-1">Job Title</dt>
            <dd className="m-0 text-sm text-(--sea-ink)">{lead.jobTitle}</dd>
          </div>
        )}
        {lead.email && (
          <div>
            <dt className="island-kicker mb-1">Email Address</dt>
            <dd className="m-0 text-sm text-(--sea-ink)">{lead.email}</dd>
          </div>
        )}
        {lead.linkedinUrl && (
          <div className="sm:col-span-2">
            <dt className="island-kicker mb-1">LinkedIn URL</dt>
            <dd className="m-0 text-sm text-(--sea-ink)">
              <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="underline">
                {lead.linkedinUrl}
              </a>
            </dd>
          </div>
        )}
        {lead.company && (
          <div>
            <dt className="island-kicker mb-1">Company Name</dt>
            <dd className="m-0 text-sm text-(--sea-ink)">{lead.company}</dd>
          </div>
        )}
        {lead.website && (
          <div>
            <dt className="island-kicker mb-1">Website URL</dt>
            <dd className="m-0 text-sm text-(--sea-ink)">
              <a href={lead.website} target="_blank" rel="noreferrer" className="underline">
                {lead.website}
              </a>
            </dd>
          </div>
        )}
        {lead.address && (
          <div className="sm:col-span-2">
            <dt className="island-kicker mb-1">Full Address</dt>
            <dd className="m-0 text-sm text-(--sea-ink)">{lead.address}</dd>
          </div>
        )}
        {lead.phone && (
          <div>
            <dt className="island-kicker mb-1">Phone Number</dt>
            <dd className="m-0 text-sm text-(--sea-ink)">{lead.phone}</dd>
          </div>
        )}
        {lead.industry && (
          <div>
            <dt className="island-kicker mb-1">Industry</dt>
            <dd className="m-0 text-sm text-(--sea-ink)">{lead.industry}</dd>
          </div>
        )}
        {lead.notes && (
          <div className="sm:col-span-2">
            <dt className="island-kicker mb-1">Lead Details</dt>
            <dd className="m-0 text-sm text-(--sea-ink)">{lead.notes}</dd>
          </div>
        )}
        {lead.extraFields.map((field, i) => (
          field.label.trim() ? (
            <div key={i}>
              <dt className="island-kicker mb-1">{field.label}</dt>
              <dd className="m-0 text-sm text-(--sea-ink)">{field.value || '—'}</dd>
            </div>
          ) : null
        ))}
        <div>
          <dt className="island-kicker mb-1">Date Added</dt>
          <dd className="m-0 text-sm text-(--sea-ink)">{formatDate(lead.dateAdded)}</dd>
        </div>
        <div>
          <dt className="island-kicker mb-1">Submitted By</dt>
          <dd className="m-0 text-sm text-(--sea-ink)">
            {contractors.find((c) => c.id === lead.assignedTo)?.name ?? 'Unassigned'}
          </dd>
        </div>
      </dl>

      <DraftEmailEditor
        lead={lead}
        subject={emailSubject}
        body={emailBody}
        onSubjectChange={setEmailSubject}
        onBodyChange={setEmailBody}
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="demo-button" onClick={() => onApprove(emailSubject, emailBody)}>
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
  subject,
  body,
  onSubjectChange,
  onBodyChange,
}: {
  lead: Lead
  subject: string
  body: string
  onSubjectChange: (v: string) => void
  onBodyChange: (v: string) => void
}) {
  const hasDraft = lead.emailStatus === 'draft' || !!lead.draftEmailSubject

  return (
    <div className="rounded-xl border border-(--line) bg-(--sand) p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="demo-section-title m-0">Outreach Email</h3>
        {hasDraft && (
          <span className="rounded-full bg-(--lagoon) px-2.5 py-0.5 text-xs font-semibold text-white">
            Draft
          </span>
        )}
      </div>

      {lead.draftEmailCreatedAt && (
        <p className="mb-3 text-xs text-(--sea-ink-soft)">
          Draft submitted {formatDateTime(lead.draftEmailCreatedAt)} — edit below before approving.
        </p>
      )}

      {!hasDraft && (
        <p className="mb-3 text-sm text-(--sea-ink-soft)">
          No draft yet. Compose one here or approve without an email.
        </p>
      )}

      <div className="mb-3">
        <label htmlFor="approval-email-to" className="island-kicker mb-1 block">
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
        <label htmlFor="approval-email-subject" className="island-kicker mb-1 block">
          Subject
        </label>
        <input
          id="approval-email-subject"
          type="text"
          className="demo-input"
          placeholder="Email subject…"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="approval-email-body" className="island-kicker mb-1 block">
          Message
        </label>
        <textarea
          id="approval-email-body"
          className="demo-textarea min-h-45"
          placeholder="Email body…"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
        />
      </div>
    </div>
  )
}

function ApproveConfirmModal({
  lead,
  adminName,
  onConfirm,
  onCancel,
}: {
  lead: Lead
  adminName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="island-shell w-full max-w-sm rounded-2xl p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-bold text-(--sea-ink)">
          Confirm Approval
        </h2>
        <p className="mb-1 text-sm text-(--sea-ink-soft)">
          Approving as <span className="font-semibold text-(--sea-ink)">{adminName}</span>
        </p>
        <p className="mb-5 text-sm text-(--sea-ink-soft)">
          This will approve <span className="font-semibold text-(--sea-ink)">{lead.name}</span>
          {lead.email ? (
            <> and send the outreach email to <span className="font-semibold text-(--sea-ink)">{lead.email}</span></>
          ) : (
            <> (no email on file — approval only)</>
          )}
          .
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className="demo-button"
            onClick={onConfirm}
          >
            Confirm &amp; Send
          </button>
          <button
            type="button"
            className="demo-button demo-button-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function SendBackModal({
  lead,
  onConfirm,
  onCancel,
}: {
  lead: Lead
  onConfirm: (message: string) => void
  onCancel: () => void
}) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    if (!message.trim()) {
      setError('Please provide a reason so the contractor knows what to fix.')
      return
    }
    onConfirm(message.trim())
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="island-shell w-full max-w-md rounded-2xl p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-bold text-(--sea-ink)">
          Send Back to Contractor
        </h2>
        <p className="mb-4 text-sm text-(--sea-ink-soft)">
          Let <span className="font-semibold text-(--sea-ink)">{lead.name}</span>'s
          contractor know what needs to be revised before you can approve.
        </p>

        <label htmlFor="send-back-message" className="island-kicker mb-1 block">
          Reason / Feedback
        </label>
        <textarea
          id="send-back-message"
          className="demo-textarea min-h-28 mb-3"
          placeholder="e.g. The email subject needs to be more specific to their industry…"
          value={message}
          onChange={(e) => { setMessage(e.target.value); setError(null) }}
          autoFocus
        />

        {error && (
          <p className="mb-3 text-sm text-[#9f3030]" role="alert">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            className="demo-button demo-button-secondary"
            onClick={handleConfirm}
          >
            Send Back
          </button>
          <button
            type="button"
            className="demo-button demo-button-ghost"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
