import type { CSSProperties } from 'react'
import { STATUS_META, type LeadStatus } from '#/data/leads'

export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="status-pill"
      style={{ '--status-color': color } as CSSProperties}
    >
      {label}
    </span>
  )
}

export default function StatusPill({ status }: { status: LeadStatus }) {
  const meta = STATUS_META[status]
  return <Pill label={meta.label} color={meta.color} />
}
