import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useLeads } from '#/lib/leads-store'
import { CONTRACTORS, STATUS_META, type Lead, type LeadStatus } from '#/data/leads'
import { formatDate } from '#/lib/format'
import StatusPill, { Pill } from '#/components/StatusPill'

export const Route = createFileRoute('/')({ component: App })

const STATUS_ORDER: Array<LeadStatus> = [
  'new',
  'contractor_review',
  'pending_approval',
  'completed',
  'rejected',
]

function countByStatus(leads: Array<Lead>): Record<LeadStatus, number> {
  const counts: Record<LeadStatus, number> = {
    new: 0,
    contractor_review: 0,
    pending_approval: 0,
    completed: 0,
    rejected: 0,
  }
  for (const lead of leads) {
    counts[lead.status] += 1
  }
  return counts
}

function App() {
  const { leads, assignLead, resetSampleData } = useLeads()
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all')

  const counts = countByStatus(leads)
  const visibleLeads =
    filter === 'all' ? leads : leads.filter((lead) => lead.status === filter)

  return (
    <main className="page-wrap px-4 py-12">
      <section className="mb-8">
        <p className="island-kicker mb-2">Lead Pipeline</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          All Leads
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
          Overview of every lead across intake, contractor review, approval,
          and the completed pile.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STATUS_ORDER.map((status) => (
          <article key={status} className="island-shell feature-card rounded-2xl p-5">
            <p className="island-kicker mb-2">{STATUS_META[status].label}</p>
            <p className="m-0 text-3xl font-bold text-[var(--sea-ink)]">
              {counts[status]}
            </p>
          </article>
        ))}
      </section>

      <section className="island-shell mt-8 rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-lg font-bold text-[var(--sea-ink)]">
            All Leads
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="demo-select demo-input-fit"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as LeadStatus | 'all')
              }
            >
              <option value="all">All statuses</option>
              {STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {STATUS_META[status].label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="demo-button demo-button-secondary"
              onClick={resetSampleData}
            >
              Reset Sample Data
            </button>
          </div>
        </div>

        <div className="demo-table-shell">
          <table className="demo-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Contact</th>
                <th>Source</th>
                <th>Date Added</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.map((lead) => (
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
                    <p className="m-0">{lead.email}</p>
                    <p className="m-0">{lead.phone}</p>
                  </td>
                  <td className="text-sm text-[var(--sea-ink-soft)]">
                    {lead.source}
                  </td>
                  <td className="text-sm text-[var(--sea-ink-soft)]">
                    {formatDate(lead.dateAdded)}
                  </td>
                  <td>
                    <StatusPill status={lead.status} />
                  </td>
                  <td>
                    <select
                      className="demo-select demo-input-fit"
                      value={lead.assignedTo}
                      onChange={(event) =>
                        assignLead(lead.id, event.target.value)
                      }
                    >
                      {CONTRACTORS.map((contractor) => (
                        <option key={contractor.id} value={contractor.id}>
                          {contractor.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {lead.emailStatus === 'sent' ? (
                      <Pill label="Sent" color="#16a34a" />
                    ) : (
                      <Pill label="Not sent" color="#64748b" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleLeads.length === 0 && (
            <p className="demo-muted p-4 text-sm">
              No leads match this filter.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
