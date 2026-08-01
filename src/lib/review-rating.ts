import type { ReviewRating } from '@/lib/fsrs/scheduler'

export const RATING_LABELS: Record<ReviewRating, string> = {
  again: 'わからなかった',
  good: 'わかった',
}

export const RATING_BADGE_CLASS: Record<ReviewRating, string> = {
  again: 'border-[var(--destructive)] text-[var(--destructive)] bg-[var(--destructive)]/10',
  good: 'border-transparent bg-primary text-primary-foreground',
}

export const RATING_DOT_CLASS: Record<ReviewRating, string> = {
  again: 'bg-[var(--destructive)]',
  good: 'bg-primary',
}

export type ReviewHistoryRating = ReviewRating

export type ReviewHistoryEntryLike = {
  rating: ReviewRating
}

export type ReviewHistorySummary = {
  total: number
  againCount: number
  goodCount: number
}

/** 履歴ページ上部のサマリー用の集計(渡された配列の範囲内で集計する軽量版) */
export function summarizeReviewHistory(entries: ReviewHistoryEntryLike[]): ReviewHistorySummary {
  return entries.reduce(
    (acc, entry) => {
      acc.total++
      if (entry.rating === 'again') acc.againCount++
      if (entry.rating === 'good') acc.goodCount++
      return acc
    },
    { total: 0, againCount: 0, goodCount: 0 }
  )
}
