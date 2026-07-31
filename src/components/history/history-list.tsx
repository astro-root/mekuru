'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import type { ReviewHistoryEntry } from '@/lib/actions/reviews'
import { RATING_LABELS, RATING_BADGE_CLASS } from '@/lib/review-rating'
import { History } from 'lucide-react'

function formatDateHeading(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z')
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const yesterday = new Date(today)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  if (dateStr === todayStr) return '今日'
  if (dateStr === yesterdayStr) return '昨日'
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

export function HistoryList({ entries }: { entries: ReviewHistoryEntry[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, ReviewHistoryEntry[]>()
    for (const entry of entries) {
      const key = entry.reviewedAt.slice(0, 10)
      const list = map.get(key)
      if (list) list.push(entry)
      else map.set(key, [entry])
    }
    return Array.from(map.entries())
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <History className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">
          まだ復習履歴がありません。デッキを開いて復習を始めましょう。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {groups.map(([dateStr, dayEntries], groupIndex) => (
        <div
          key={dateStr}
          className="animate-in fade-in slide-in-from-bottom-2 space-y-2"
          style={{ animationDelay: `${Math.min(groupIndex, 6) * 40}ms`, animationFillMode: 'backwards' }}
        >
          <div className="sticky top-0 z-10 flex items-center gap-2 bg-background/95 py-1 backdrop-blur-sm">
            <h2 className="font-heading text-sm font-bold">{formatDateHeading(dateStr)}</h2>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {dayEntries.length}件
            </span>
          </div>
          <div className="space-y-1.5">
            {dayEntries.map((entry) => (
              <Link
                key={entry.id}
                href={`/decks/${entry.deckId}`}
                className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.front}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{entry.deckName}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${RATING_BADGE_CLASS[entry.rating]}`}
                >
                  {RATING_LABELS[entry.rating]}
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {formatTime(entry.reviewedAt)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
