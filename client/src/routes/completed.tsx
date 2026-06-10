import { createFileRoute } from '@tanstack/react-router'
import { useLeads } from '#/lib/leads-store'
import { formatDate, formatDateTime } from '#/lib/format'
import { Pill } from '#/components/StatusPill'
import RequireAuth from '#/components/RequireAuth'

export const Route = createFileRoute('/completed')({
  component: () => (
    <RequireAuth roles={['admin']}>
      <CompletedPage />
    </RequireAuth>
  ),
})

function CompletedPage() {
  const { leads } = useLeads()
  const approved = leads.filter((lead) => lead.status === 'completed')
  const rejected = leads.filter((lead) => lead.status === 'rejected')

  return (
    <main className="page-wrap px-4 py-12">
      <section className="mb-6">
        <p className="island-kicker mb-2">Completed</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Completed Pile
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
          Leads that have finished the review pipeline, including approval
          emails sent to the team.
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="island-shell rounded-2xl p-6">
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
                      {lead.adminNotes || lead.contractorNotes || '—'}
                    </td>
                    <td className="text-sm text-[var(--sea-ink-soft)]">
                      {lead.adminReviewedAt
                        ? formatDateTime(lead.adminReviewedAt)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
