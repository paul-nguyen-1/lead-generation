import type { ReactNode } from 'react'
import type { Lead } from '#/data/leads'
import { formatDate } from '#/lib/format'
import StatusPill from '#/components/StatusPill'

export function LeadDetailHeader({
  lead,
  right,
}: {
  lead: Lead
  right?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="m-0 text-xl font-bold text-(--sea-ink)">{lead.name}</h2>
        {lead.company && (
          <p className="m-0 text-sm text-(--sea-ink-soft)">{lead.company}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <StatusPill status={lead.status} />
        {right}
      </div>
    </div>
  )
}

export function LeadFieldsGrid({
  lead,
  trailing,
}: {
  lead: Lead
  trailing?: Array<{ label: string; value: ReactNode }>
}) {
  return (
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
        <dt className="island-kicker mb-1">Source</dt>
        <dd className="m-0 text-sm text-(--sea-ink)">{lead.source || '—'}</dd>
      </div>
      {lead.extraFields.map((field, i) =>
        field.label.trim() ? (
          <div key={i}>
            <dt className="island-kicker mb-1">{field.label}</dt>
            <dd className="m-0 text-sm text-(--sea-ink)">{field.value || '—'}</dd>
          </div>
        ) : null,
      )}
      <div>
        <dt className="island-kicker mb-1">Date Added</dt>
        <dd className="m-0 text-sm text-(--sea-ink)">{formatDate(lead.dateAdded)}</dd>
      </div>
      {trailing?.map(({ label, value }) => (
        <div key={label}>
          <dt className="island-kicker mb-1">{label}</dt>
          <dd className="m-0 text-sm text-(--sea-ink)">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function LeadNotes({ notes }: { notes: string }) {
  if (!notes) return null
  return (
    <div className="mb-5">
      <h3 className="demo-section-title mb-2">Lead Details</h3>
      <p className="demo-card m-0 text-sm text-(--sea-ink-soft)">{notes}</p>
    </div>
  )
}
