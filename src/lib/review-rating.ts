import type { ReviewRating } from '@/lib/fsrs/scheduler'

export const RATING_LABELS: Record<ReviewRating, string> = {
  again: 'もう一度',
  hard: '難しい',
  good: '普通',
  easy: '簡単',
}

export const RATING_BADGE_CLASS: Record<ReviewRating, string> = {
  again: 'border-[var(--destructive)] text-[var(--destructive)] bg-[var(--destructive)]/10',
  hard: 'border-[var(--chart-2)] text-[var(--accent-foreground)] bg-[var(--accent)]/60',
  good: 'border-transparent bg-secondary text-secondary-foreground',
  easy: 'border-transparent bg-primary text-primary-foreground',
}

export const RATING_DOT_CLASS: Record<ReviewRating, string> = {
  again: 'bg-[var(--destructive)]',
  hard: 'bg-[var(--chart-2)]',
  good: 'bg-[var(--chart-3)]',
  easy: 'bg-primary',
}

export type ReviewHistoryRating = ReviewRating

export type ReviewHistoryEntryLike = {
  rating: ReviewRating
}

export type ReviewHistorySummary = {
  total: number
  againCount: number
  hardCount: number
  goodCount: number
  easyCount: number
}

/** 履歴ページ上部のサマリー用の集計(渡された配列の範囲内で集計する軽量版) */
export function summarizeReviewHistory(entries: ReviewHistoryEntryLike[]): ReviewHistorySummary {
  return entries.reduce(
    (acc, entry) => {
      acc.total++
      if (entry.rating === 'again') acc.againCount++
      if (entry.rating === 'hard') acc.hardCount++
      if (entry.rating === 'good') acc.goodCount++
      if (entry.rating === 'easy') acc.easyCount++
      return acc
    },
    { total: 0, againCount: 0, hardCount: 0, goodCount: 0, easyCount: 0 }
  )
}
