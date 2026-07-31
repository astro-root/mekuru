import { Flame, CalendarCheck } from 'lucide-react'

export function ReviewStatsBar({
  streak,
  todayCount,
}: {
  streak: number
  todayCount: number
}) {
  return (
    <div className="flex items-center justify-center gap-4 rounded-lg border border-border bg-card px-4 py-2">
      <div className="flex items-center gap-1.5">
        <Flame className="h-4 w-4" style={{ color: 'var(--chart-2)' }} strokeWidth={2} />
        <span className="font-mono text-sm font-medium tabular-nums">{streak}</span>
        <span className="text-xs text-muted-foreground">日連続</span>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-1.5">
        <CalendarCheck className="h-4 w-4 text-primary" strokeWidth={2} />
        <span className="font-mono text-sm font-medium tabular-nums">{todayCount}</span>
        <span className="text-xs text-muted-foreground">今日の復習</span>
      </div>
    </div>
  )
}
