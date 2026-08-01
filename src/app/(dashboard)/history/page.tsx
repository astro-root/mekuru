import type { Metadata } from "next";
import { getReviewHistory, getReviewStats } from '@/lib/actions/reviews'
import { summarizeReviewHistory } from '@/lib/review-rating'
import { HistoryList } from '@/components/history/history-list'
import { RATING_LABELS, RATING_DOT_CLASS } from '@/lib/review-rating'
import type { ReviewRating } from '@/lib/fsrs/scheduler'

export const metadata: Metadata = {
  title: "学習履歴",
}

export default async function HistoryPage() {
  const [entries, stats] = await Promise.all([getReviewHistory(200), getReviewStats()])
  const summary = summarizeReviewHistory(entries)

  const breakdown: { key: ReviewRating; count: number }[] = [
    { key: 'again', count: summary.againCount },
    { key: 'good', count: summary.goodCount },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold">学習履歴</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          過去にめくった問題と、そのときの評価を振り返れます。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-mono text-2xl font-bold tabular-nums">{stats.streak}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">日連続</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-mono text-2xl font-bold tabular-nums">{stats.todayCount}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">今日の復習</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-mono text-2xl font-bold tabular-nums">{summary.total}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            直近{summary.total >= 200 ? '200' : ''}件の履歴
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            {breakdown.map((b) => (
              <span key={b.key} className="flex items-center gap-1 text-xs">
                <span className={`h-1.5 w-1.5 rounded-full ${RATING_DOT_CLASS[b.key]}`} />
                {RATING_LABELS[b.key]} {b.count}
              </span>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">評価の内訳</p>
        </div>
      </div>

      <HistoryList entries={entries} />
    </div>
  )
}
