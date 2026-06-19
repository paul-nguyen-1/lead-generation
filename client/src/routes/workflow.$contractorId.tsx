import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useLeads, type CreateLeadInput, type ExtraFieldInput } from '#/lib/leads-store'
import { useAuth } from '#/lib/auth-store'
import { useContractors } from '#/lib/contractors'
import RequireAuth from '#/components/RequireAuth'
import { type Lead } from '#/data/leads'
import { formatDate, formatDateTime } from '#/lib/format'
import { ApiError } from '#/lib/api'
import StatusPill, { Pill } from '#/components/StatusPill'
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
        <h1 className="display-title text-3xl font-bold text-(--sea-ink) sm:text-4xl">
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
          <h1 className="display-title text-3xl font-bold text-(--sea-ink) sm:text-4xl">
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
        <h1 className="display-title text-3xl font-bold text-(--sea-ink) sm:text-4xl">
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
          : 'text-[var(--sea-ink-soft)] hover:text-(--sea-ink)',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// ─── My Leads tab ────────────────────────────────────────────────────────────

function ContractorWorkflowTab() {
  const { contractorId } = Route.useParams()
  const { leads, createLead } = useLeads()
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
        Log new leads as you generate them. Once submitted, leads are locked
        and sent to the admin for review.
      </p>

      <div className="mb-6">
        <AddLeadForm onCreate={createLead} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="demo-panel">
          <h2 className="demo-section-title mb-3">
            My Leads ({history.length})
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
              Select a lead from the list to view its details.
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
        <h2 className="m-0 text-xl font-bold text-(--sea-ink)">
          {lead.name}
        </h2>
        {lead.company && (
          <p className="m-0 text-sm text-[var(--sea-ink-soft)]">{lead.company}</p>
        )}
        <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">
          To: <span className="font-medium">{recipientEmail}</span>
        </p>
        {lead.emailStatus === 'draft' && lead.draftEmailCreatedAt && (
          <div className="mt-2 flex items-center gap-2">
            <Pill label="Pending" color="#7c3aed" />
            <span className="text-xs text-(--sea-ink-soft)">
              Draft saved &mdash; awaiting admin review.
            </span>
          </div>
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
    firstName: '',
    lastName: '',
    jobTitle: '',
    email: '',
    linkedinUrl: '',
    businessName: '',
    website: '',
    address: '',
    phone: '',
    industry: '',
    notes: '',
    extraFields: [],
  }
  const [form, setForm] = useState<CreateLeadInput>(emptyForm)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<TKey extends keyof CreateLeadInput>(
    key: TKey,
    value: CreateLeadInput[TKey],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function addExtraField() {
    setForm((current) => ({
      ...current,
      extraFields: [...(current.extraFields ?? []), { label: '', value: '' }],
    }))
  }

  function updateExtraField(index: number, patch: Partial<ExtraFieldInput>) {
    setForm((current) => {
      const fields = [...(current.extraFields ?? [])]
      fields[index] = { ...fields[index], ...patch }
      return { ...current, extraFields: fields }
    })
  }

  function removeExtraField(index: number) {
    setForm((current) => ({
      ...current,
      extraFields: (current.extraFields ?? []).filter((_, i) => i !== index),
    }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!form.firstName?.trim() && !form.lastName?.trim() && !form.businessName?.trim()) {
      setError('Enter at least a first name, last name, or company name.')
      return
    }

    setConfirming(true)
  }

  async function handleConfirm() {
    setError(null)
    setSubmitting(true)
    try {
      await onCreate(form)
      setForm(emptyForm)
      setConfirming(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add lead')
    } finally {
      setSubmitting(false)
    }
  }

  const extraFields = form.extraFields ?? []

  const FIELD_LABELS: Array<[keyof CreateLeadInput, string]> = [
    ['firstName', 'First Name'],
    ['lastName', 'Last Name'],
    ['jobTitle', 'Job Title'],
    ['email', 'Email Address'],
    ['linkedinUrl', 'LinkedIn URL'],
    ['businessName', 'Company Name'],
    ['website', 'Website URL'],
    ['address', 'Full Address'],
    ['phone', 'Phone Number'],
    ['industry', 'Industry'],
    ['notes', 'Lead Details'],
  ]

  if (confirming) {
    return (
      <div className="demo-panel">
        <h2 className="demo-section-title mb-1">Confirm Lead</h2>
        <p className="mb-4 text-sm text-(--sea-ink-soft)">
          Review the details below. Once submitted, this lead cannot be edited.
        </p>

        <dl className="mb-4 grid gap-2 sm:grid-cols-2">
          {FIELD_LABELS.map(([key, label]) => {
            const val = form[key] as string | undefined
            if (!val?.trim()) return null
            return (
              <div key={key} className={key === 'notes' || key === 'linkedinUrl' || key === 'address' ? 'sm:col-span-2' : ''}>
                <dt className="island-kicker mb-0.5">{label}</dt>
                <dd className="m-0 break-all text-sm text-(--sea-ink)">{val}</dd>
              </div>
            )
          })}
          {extraFields.filter((f) => f.label.trim()).map((field, i) => (
            <div key={i}>
              <dt className="island-kicker mb-0.5">{field.label}</dt>
              <dd className="m-0 text-sm text-(--sea-ink)">{field.value || '—'}</dd>
            </div>
          ))}
        </dl>

        {error && (
          <p className="mb-3 text-sm text-[#9f3030]" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            className="demo-button"
            onClick={() => void handleConfirm()}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Confirm & Submit'}
          </button>
          <button
            type="button"
            className="demo-button demo-button-secondary"
            onClick={() => { setConfirming(false); setError(null) }}
            disabled={submitting}
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="demo-panel">
      <h2 className="demo-section-title mb-4">Add Lead</h2>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-first-name" className="island-kicker mb-1 block">
              First Name
            </label>
            <input
              id="lead-first-name"
              type="text"
              className="demo-input"
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="lead-last-name" className="island-kicker mb-1 block">
              Last Name
            </label>
            <input
              id="lead-last-name"
              type="text"
              className="demo-input"
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="lead-job-title" className="island-kicker mb-1 block">
              Job Title
            </label>
            <input
              id="lead-job-title"
              type="text"
              className="demo-input"
              value={form.jobTitle}
              onChange={(e) => update('jobTitle', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="lead-email" className="island-kicker mb-1 block">
              Email Address
            </label>
            <input
              id="lead-email"
              type="email"
              className="demo-input"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="lead-linkedin" className="island-kicker mb-1 block">
              LinkedIn URL
            </label>
            <input
              id="lead-linkedin"
              type="url"
              className="demo-input"
              placeholder="https://linkedin.com/in/…"
              value={form.linkedinUrl}
              onChange={(e) => update('linkedinUrl', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="lead-company" className="island-kicker mb-1 block">
              Company Name
            </label>
            <input
              id="lead-company"
              type="text"
              className="demo-input"
              value={form.businessName}
              onChange={(e) => update('businessName', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="lead-website" className="island-kicker mb-1 block">
              Website URL
            </label>
            <input
              id="lead-website"
              type="url"
              className="demo-input"
              placeholder="https://…"
              value={form.website}
              onChange={(e) => update('website', e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="lead-address" className="island-kicker mb-1 block">
              Full Address
            </label>
            <input
              id="lead-address"
              type="text"
              className="demo-input"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="lead-phone" className="island-kicker mb-1 block">
              Phone Number
            </label>
            <input
              id="lead-phone"
              type="tel"
              className="demo-input"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="lead-industry" className="island-kicker mb-1 block">
              Industry
            </label>
            <input
              id="lead-industry"
              type="text"
              className="demo-input"
              value={form.industry}
              onChange={(e) => update('industry', e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="lead-notes" className="island-kicker mb-1 block">
              Lead Details
            </label>
            <textarea
              id="lead-notes"
              className="demo-textarea"
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
          </div>
        </div>

        {extraFields.length > 0 && (
          <div className="mt-4 grid gap-3">
            <p className="island-kicker">Additional Fields</p>
            {extraFields.map((field, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  className="demo-input w-36 shrink-0"
                  placeholder="Field name"
                  value={field.label}
                  onChange={(e) => updateExtraField(index, { label: e.target.value })}
                />
                <input
                  type="text"
                  className="demo-input flex-1"
                  placeholder="Value"
                  value={field.value}
                  onChange={(e) => updateExtraField(index, { value: e.target.value })}
                />
                <button
                  type="button"
                  className="shrink-0 rounded p-1 text-sm text-(--sea-ink-soft) hover:text-[#9f3030]"
                  onClick={() => removeExtraField(index)}
                  aria-label="Remove field"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="demo-button demo-button-secondary mt-4"
          onClick={addExtraField}
        >
          + Add Field
        </button>

        {error && (
          <p className="mt-3 text-sm text-[#9f3030]" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="demo-button mt-3 ml-2"
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
          <h2 className="m-0 text-xl font-bold text-(--sea-ink)">
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
        <div>
          <dt className="island-kicker mb-1">Date Added</dt>
          <dd className="m-0 text-sm text-(--sea-ink)">{formatDate(lead.dateAdded)}</dd>
        </div>
        <div>
          <dt className="island-kicker mb-1">Last Updated</dt>
          <dd className="m-0 text-sm text-(--sea-ink)">{formatDateTime(lead.dateUpdated)}</dd>
        </div>
        {lead.extraFields.map((field, i) => (
          <div key={i}>
            <dt className="island-kicker mb-1">{field.label}</dt>
            <dd className="m-0 text-sm text-(--sea-ink)">{field.value || '—'}</dd>
          </div>
        ))}
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
  return <LeadDetail lead={lead} />
}

