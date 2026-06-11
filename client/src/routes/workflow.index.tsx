import { Link, createFileRoute } from '@tanstack/react-router'
import { useLeads } from '#/lib/leads-store'
import { useContractors } from '#/lib/contractors'
import RequireAuth from '#/components/RequireAuth'

export const Route = createFileRoute('/workflow/')({
  component: () => (
    <RequireAuth roles={['admin']}>
      <WorkflowIndexPage />
    </RequireAuth>
  ),
})

function WorkflowIndexPage() {
  const { leads } = useLeads()
  const { contractors } = useContractors()

  return (
    <main className="page-wrap px-4 py-12">
      <section className="mb-6">
        <p className="island-kicker mb-2">Workflow</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Contractor Queues
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
          Each contractor reviews their own assigned leads.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {contractors.map((contractor) => {
          const queue = leads.filter(
            (lead) =>
              lead.assignedTo === contractor.id &&
              (lead.status === 'new' || lead.status === 'contractor_review'),
          )
          return (
            <Link
              key={contractor.id}
              to="/workflow/$contractorId"
              params={{ contractorId: contractor.id }}
              className="island-shell feature-card rounded-2xl p-5 no-underline"
            >
              <h2 className="m-0 text-lg font-bold text-[var(--sea-ink)]">
                {contractor.name}
              </h2>
              <p className="m-0 mt-2 text-sm text-[var(--sea-ink-soft)]">
                {queue.length} {queue.length === 1 ? 'lead' : 'leads'} in
                queue
              </p>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
