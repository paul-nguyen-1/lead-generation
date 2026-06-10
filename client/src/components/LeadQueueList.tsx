import type { Lead } from '#/data/leads'
import { formatDate } from '#/lib/format'
import StatusPill from './StatusPill'

interface LeadQueueListProps {
  leads: Array<Lead>
  selectedId: string | null
  onSelect: (leadId: string) => void
  emptyMessage?: string
}

export default function LeadQueueList({
  leads,
  selectedId,
  onSelect,
  emptyMessage = 'No leads in this queue.',
}: LeadQueueListProps) {
  if (leads.length === 0) {
    return <p className="demo-muted text-sm">{emptyMessage}</p>
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {leads.map((lead) => (
        <li key={lead.id}>
          <button
            type="button"
            onClick={() => onSelect(lead.id)}
            className={`demo-list-item w-full text-left transition ${
              lead.id === selectedId
                ? 'border-[color-mix(in_oklab,var(--lagoon-deep)_55%,var(--line))] bg-[color-mix(in_oklab,var(--lagoon)_14%,var(--chip-bg))]'
                : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
                  {lead.name}
                </p>
                {lead.company && (
                  <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
                    {lead.company}
                  </p>
                )}
              </div>
              <StatusPill status={lead.status} />
            </div>
            <p className="m-0 mt-2 text-xs text-[var(--sea-ink-soft)]">
              Added {formatDate(lead.dateAdded)} &middot; {lead.source}
            </p>
          </button>
        </li>
      ))}
    </ul>
  )
}
