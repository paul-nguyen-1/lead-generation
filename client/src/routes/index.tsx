import { createFileRoute } from '@tanstack/react-router'
import { useContractorAnalytics } from '#/lib/contractor-analytics'
import RequireAuth from '#/components/RequireAuth'

export const Route = createFileRoute('/')({
  component: () => (
    <RequireAuth roles={['admin']}>
      <App />
    </RequireAuth>
  ),
})

function App() {
  const { contractors, loading } = useContractorAnalytics()

  return (
    <main className="page-wrap px-4 py-12">
      <section className="mb-8">
        <p className="island-kicker mb-2">Lead Pipeline</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Contractor Leaderboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
          Ranking contractors by lead-generation efficiency: completed leads,
          approval rate, and recent activity.
        </p>
      </section>

      <section className="island-shell rounded-2xl p-6">
        <div className="demo-table-shell">
          <table className="demo-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Contractor</th>
                <th>Total Leads</th>
                <th>Completed</th>
                <th>Rejected</th>
                <th>In Progress</th>
                <th>Approval Rate</th>
                <th>Leads (Last 7 Days)</th>
                <th>Avg. Review Time</th>
              </tr>
            </thead>
            <tbody>
              {contractors.map((contractor) => (
                <tr key={contractor.id}>
                  <td className="font-semibold text-[var(--sea-ink)]">
                    #{contractor.rank}
                  </td>
                  <td className="font-semibold text-[var(--sea-ink)]">
                    {contractor.name}
                  </td>
                  <td>{contractor.totalLeads}</td>
                  <td>{contractor.completedLeads}</td>
                  <td>{contractor.rejectedLeads}</td>
                  <td>{contractor.inProgressLeads}</td>
                  <td>
                    {contractor.approvalRate !== null
                      ? `${contractor.approvalRate.toString()}%`
                      : '—'}
                  </td>
                  <td>{contractor.leadsLast7Days}</td>
                  <td>
                    {contractor.avgReviewHours !== null
                      ? `${contractor.avgReviewHours.toString()}h`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && contractors.length === 0 && (
            <p className="demo-muted p-4 text-sm">
              No contractors have logged any leads yet.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
