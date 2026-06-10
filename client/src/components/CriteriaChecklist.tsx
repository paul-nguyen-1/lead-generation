import { Check, X } from 'lucide-react'
import type { Criterion } from '#/data/leads'

interface CriteriaChecklistProps {
  criteria: Array<Criterion>
  editable?: boolean
  onToggle?: (criterionId: string) => void
}

export default function CriteriaChecklist({
  criteria,
  editable = false,
  onToggle,
}: CriteriaChecklistProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {criteria.map((criterion) =>
        editable ? (
          <li key={criterion.id}>
            <label className="demo-list-item flex cursor-pointer items-center gap-3 text-sm text-[var(--sea-ink)]">
              <input
                type="checkbox"
                checked={criterion.met}
                onChange={() => onToggle?.(criterion.id)}
                className="h-4 w-4 accent-[var(--lagoon-deep)]"
              />
              {criterion.label}
            </label>
          </li>
        ) : (
          <li key={criterion.id}>
            <div className="demo-list-item flex items-center gap-3 text-sm text-[var(--sea-ink)]">
              {criterion.met ? (
                <Check className="h-4 w-4 shrink-0 text-[#16a34a]" />
              ) : (
                <X className="h-4 w-4 shrink-0 text-[#dc2626]" />
              )}
              {criterion.label}
            </div>
          </li>
        ),
      )}
    </ul>
  )
}
