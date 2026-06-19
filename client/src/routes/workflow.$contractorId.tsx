import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useLeads, type CreateLeadInput } from '#/lib/leads-store'
import { useAuth } from '#/lib/auth-store'
import { useContractors } from '#/lib/contractors'
import RequireAuth from '#/components/RequireAuth'
import { type Lead } from '#/data/leads'
import { formatDate, formatDateTime } from '#/lib/format'
import { ApiError } from '#/lib/api'
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
        <WorkflowRouter />
      </RequireAuth>
    )
  },
})

function WorkflowRouter() {
  const { user } = useAuth()
  return user?.role === 'admin' ? (
    <AdminContractorHistoryPage />
  ) : (
    <ContractorPortal />
  )
}

function sortByRecentlyUpdated(leads: Array<Lead>) {
  return [...leads].sort(
    (a, b) => +new Date(b.dateUpdated) - +new Date(a.dateUpdated),
  )
}

// ─── Admin view ──────────────────────────────────────────────────────────────

function AdminContractorHistoryPage() {
  const { contractorId } = Route.useParams()
  const { contractors } = useContractors()
  const contractorName =
    contractors.find((c) => c.id === contractorId)?.name ?? 'Contractor'
  const { leads } = useLeads()
  const history = sortByRecentlyUpdated(
    leads.filter((lead) => lead.assignedTo === contractorId),
  )
  const [selectedId, setSelectedId] = useState<string | null>(
    history[0]?.id ?? null,
  )
  const selected =
    history.find((lead) => lead.id === selectedId) ?? history[0] ?? null

  return (
    <main className="page-wrap px-4 py-12">
      <section className="mb-6">
        <Link to="/workflow" className="nav-link text-sm">
          &larr; All Contractors
        </Link>
        <p className="island-kicker mb-2 mt-3">Workflow</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          {contractorName} &mdash; History
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
          Every lead this contractor has logged, most recently updated first.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="demo-panel">
          <h2 className="demo-section-title mb-3">
            History ({history.length})
          </h2>
          <LeadQueueList
            leads={history}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            emptyMessage="No leads logged yet."
          />
        </div>

        <div className="demo-panel">
          {selected ? (
            <LeadDetailReadOnly lead={selected} />
          ) : (
            <p className="demo-muted text-sm">
              Select a lead from the history to view details.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

// ─── Contractor portal with tabs ─────────────────────────────────────────────

type ContractorTab = 'workflow' | 'draft-email'

function ContractorPortal() {
  const { user } = useAuth()
  const perms = user?.permissions
  const hasLeads = perms?.leadsAccess ?? false
  const hasDraft = perms?.draftEmailAccess ?? false

  const defaultTab: ContractorTab = hasLeads
    ? 'workflow'
    : hasDraft
      ? 'draft-email'
      : 'workflow'

  const [activeTab, setActiveTab] = useState<ContractorTab>(defaultTab)

  if (!hasLeads && !hasDraft) {
    return (
      <main className="page-wrap px-4 py-12">
        <section className="mb-6">
          <p className="island-kicker mb-2">My Portal</p>
          <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
            Contractor Workspace
          </h1>
        </section>
        <div className="demo-panel max-w-lg">
          <p className="text-sm text-[var(--sea-ink-soft)]">
            You don't have access to any features yet. Contact your admin to
            enable Leads or Draft Email access for your account.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="page-wrap px-4 py-12">
      <section className="mb-6">
        <p className="island-kicker mb-2">My Portal</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Contractor Workspace
        </h1>
      </section>

      {hasLeads && hasDraft && (
        <div className="mb-6 flex gap-1 border-b border-[var(--line)]">
          <TabButton
            active={activeTab === 'workflow'}
            onClick={() => setActiveTab('workflow')}
          >
            My Leads
          </TabButton>
          <TabButton
            active={activeTab === 'draft-email'}
            onClick={() => setActiveTab('draft-email')}
          >
            Draft Email
          </TabButton>
        </div>
      )}

      {activeTab === 'workflow' && hasLeads ? (
        <ContractorWorkflowTab />
      ) : hasDraft ? (
        <DraftEmailTab />
      ) : null}
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

// ─── My Leads tab ────────────────────────────────────────────────────────────

function ContractorWorkflowTab() {
  const { contractorId } = Route.useParams()
  const {
    leads,
    createLead,
    toggleCriterion,
    setContractorNotes,
    submitForApproval,
    rejectLead,
  } = useLeads()
  const history = sortByRecentlyUpdated(
    leads.filter((lead) => lead.assignedTo === contractorId),
  )
  const [selectedId, setSelectedId] = useState<string | null>(
    history[0]?.id ?? null,
  )
  const selected =
    history.find((lead) => lead.id === selectedId) ?? history[0] ?? null

  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
        Log new leads as you generate them, review them against our criteria,
        leave notes, and submit for approval.
      </p>

      <div className="mb-6">
        <AddLeadForm onCreate={createLead} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="demo-panel">
          <h2 className="demo-section-title mb-3">
            History ({history.length})
          </h2>
          <LeadQueueList
            leads={history}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            emptyMessage="No leads logged yet."
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
              Select a lead from the history to begin reviewing.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Draft Email tab ──────────────────────────────────────────────────────────

function DraftEmailTab() {
  const { contractorId } = Route.useParams()
  const { leads, saveDraftEmail } = useLeads()
  const myLeads = sortByRecentlyUpdated(
    leads.filter((lead) => lead.assignedTo === contractorId),
  )
  const [selectedId, setSelectedId] = useState<string | null>(
    myLeads[0]?.id ?? null,
  )
  const selected =
    myLeads.find((lead) => lead.id === selectedId) ?? myLeads[0] ?? null

  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
        Draft an outreach email for one of your leads. An admin will review,
        edit if needed, and send it on approval.
      </p>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="demo-panel">
          <h2 className="demo-section-title mb-3">
            My Leads ({myLeads.length})
          </h2>
          <LeadQueueList
            leads={myLeads}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            emptyMessage="No leads yet. Add one in the My Leads tab."
          />
        </div>

        <div className="demo-panel">
          {selected ? (
            <DraftEmailForm
              lead={selected}
              onSave={(subject, body) =>
                void saveDraftEmail(selected.id, subject, body)
              }
            />
          ) : (
            <p className="demo-muted text-sm">
              Select a lead to draft an email.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function DraftEmailForm({
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

  const recipientEmail = lead.email || '(no email on file)'

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

  return (
    <div>
      <div className="mb-4">
        <h2 className="m-0 text-xl font-bold text-[var(--sea-ink)]">
          {lead.name}
        </h2>
        {lead.company && (
          <p className="m-0 text-sm text-[var(--sea-ink-soft)]">{lead.company}</p>
        )}
        <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">
          To: <span className="font-medium">{recipientEmail}</span>
        </p>
        {lead.emailStatus === 'draft' && lead.draftEmailCreatedAt && (
          <p className="mt-1 text-xs text-[var(--lagoon-deep)]">
            Draft saved &mdash; awaiting admin review
          </p>
        )}
        {lead.emailStatus === 'sent' && (
          <p className="mt-1 text-xs text-[var(--palm)] font-semibold">
            Email already sent
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="draft-subject" className="island-kicker mb-1 block">
          Subject
        </label>
        <input
          id="draft-subject"
          type="text"
          className="demo-input"
          placeholder="e.g. Following up on your business…"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={lead.emailStatus === 'sent'}
        />
      </div>

      <div className="mb-5">
        <label htmlFor="draft-body" className="island-kicker mb-1 block">
          Message
        </label>
        <textarea
          id="draft-body"
          className="demo-textarea min-h-[220px]"
          placeholder="Write your outreach message here…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={lead.emailStatus === 'sent'}
        />
      </div>

      {error && (
        <p className="mb-3 text-sm text-[#9f3030]" role="alert">
          {error}
        </p>
      )}

      {lead.emailStatus !== 'sent' && (
        <button
          type="button"
          className="demo-button"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Draft'}
        </button>
      )}
    </div>
  )
}

// ─── Shared detail components ─────────────────────────────────────────────────

function AddLeadForm({
  onCreate,
}: {
  onCreate: (input: CreateLeadInput) => Promise<void>
}) {
  const emptyForm: CreateLeadInput = {
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    source: '',
    notes: '',
  }
  const [form, setForm] = useState<CreateLeadInput>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<TKey extends keyof CreateLeadInput>(
    key: TKey,
    value: CreateLeadInput[TKey],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!form.businessName?.trim() && !form.contactName?.trim()) {
      setError('Enter a business name or a contact name.')
      return
    }

    setSubmitting(true)
    try {
      await onCreate(form)
      setForm(emptyForm)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add lead')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="demo-panel">
      <h2 className="demo-section-title mb-3">Add Lead</h2>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-business-name" className="island-kicker mb-1 block">
              Business Name
            </label>
            <input
              id="lead-business-name"
              type="text"
              className="demo-input"
              value={form.businessName}
              onChange={(event) => update('businessName', event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="lead-contact-name" className="island-kicker mb-1 block">
              Contact Name
            </label>
            <input
              id="lead-contact-name"
              type="text"
              className="demo-input"
              value={form.contactName}
              onChange={(event) => update('contactName', event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="lead-email" className="island-kicker mb-1 block">
              Email
            </label>
            <input
              id="lead-email"
              type="email"
              className="demo-input"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="lead-phone" className="island-kicker mb-1 block">
              Phone
            </label>
            <input
              id="lead-phone"
              type="tel"
              className="demo-input"
              value={form.phone}
              onChange={(event) => update('phone', event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="lead-address" className="island-kicker mb-1 block">
              Address
            </label>
            <input
              id="lead-address"
              type="text"
              className="demo-input"
              value={form.address}
              onChange={(event) => update('address', event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="lead-website" className="island-kicker mb-1 block">
              Website
            </label>
            <input
              id="lead-website"
              type="text"
              className="demo-input"
              value={form.website}
              onChange={(event) => update('website', event.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="lead-source" className="island-kicker mb-1 block">
              Source
            </label>
            <input
              id="lead-source"
              type="text"
              placeholder="e.g. Referral, Cold call, Walk-in"
              className="demo-input"
              value={form.source}
              onChange={(event) => update('source', event.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="lead-notes" className="island-kicker mb-1 block">
              Notes
            </label>
            <textarea
              id="lead-notes"
              className="demo-textarea"
              value={form.notes}
              onChange={(event) => update('notes', event.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-[#9f3030]" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="demo-button mt-4"
          disabled={submitting}
        >
          {submitting ? 'Adding…' : 'Add Lead'}
        </button>
      </form>
    </div>
  )
}

function LeadDetail({
  lead,
  children,
}: {
  lead: Lead
  children?: React.ReactNode
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
          <dt className="island-kicker mb-1">Address</dt>
          <dd className="m-0 text-sm text-[var(--sea-ink)]">
            {lead.address}
          </dd>
        </div>
        <div>
          <dt className="island-kicker mb-1">Website</dt>
          <dd className="m-0 text-sm text-[var(--sea-ink)]">
            {lead.website}
          </dd>
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
          <dt className="island-kicker mb-1">Last Updated</dt>
          <dd className="m-0 text-sm text-[var(--sea-ink)]">
            {formatDateTime(lead.dateUpdated)}
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

      {children}
    </div>
  )
}

function LeadDetailReadOnly({ lead }: { lead: Lead }) {
  return (
    <LeadDetail lead={lead}>
      <div className="mb-5">
        <h3 className="demo-section-title mb-2">Review Criteria</h3>
        <CriteriaChecklist criteria={lead.criteria} />
      </div>

      <div>
        <h3 className="demo-section-title mb-2">Contractor Notes</h3>
        <p className="demo-card m-0 text-sm text-[var(--sea-ink-soft)]">
          {lead.contractorNotes || 'No notes yet.'}
        </p>
      </div>
    </LeadDetail>
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
    <LeadDetail lead={lead}>
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
    </LeadDetail>
  )
}
