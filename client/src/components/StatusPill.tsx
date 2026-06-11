import type { CSSProperties } from 'react'
import { STATUS_META, type LeadStatus } from '#/data/leads'

export function Pill({
  label,
  color,
  title,
}: {
  label: string
  color: string
  title?: string
}) {
  return (
    <span
      className="status-pill"
      style={{ '--status-color': color } as CSSProperties}
      title={title}
    >
      {label}
    </span>
  )
}

export default function StatusPill({ status }: { status: LeadStatus }) {
  const meta = STATUS_META[status]
  return <Pill label={meta.label} color={meta.color} />
}
