export default function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[color-mix(in_oklab,var(--sea-ink)_12%,var(--chip-bg))] ${className}`}
    />
  )
}

export function QueueListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="demo-list-item">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3 w-1/2" />
        </li>
      ))}
    </ul>
  )
}

export function LeadDetailSkeleton({ fields = 8 }: { fields?: number }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          <Skeleton className="mb-2 h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <Skeleton className="mb-1.5 h-3 w-20" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>

      <Skeleton className="mb-2 h-3 w-24" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  )
}

export function TableSkeleton({
  columns = 4,
  rows = 4,
}: {
  columns?: number
  rows?: number
}) {
  return (
    <div className="demo-table-shell">
      <table className="demo-table">
        <tbody>
          {Array.from({ length: rows }).map((_row, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_col, col) => (
                <td key={col}>
                  <Skeleton className="h-4 w-full max-w-32" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="island-shell rounded-2xl p-5">
          <Skeleton className="mb-2 h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  )
}

export function ContractorRowSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-(--line)">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="mb-2 h-3 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-9 w-28 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  )
}
