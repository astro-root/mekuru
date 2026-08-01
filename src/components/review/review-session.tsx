'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { renderClozeQuestion, renderClozeAnswer } from '@/lib/cloze'
import {
  hydrateDeckCache,
  getCachedDueCards,
  applyReviewOffline,
  syncPendingReviews,
  type OfflineDueCard,
} from '@/lib/offline/sync'
import type { ReviewRating } from '@/lib/fsrs/scheduler'
import type { ReviewStats } from '@/lib/actions/reviews'
import { ReviewStatsBar } from './review-stats-bar'
import { WifiOff, PartyPopper, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

const RATING_CONFIG: {
  key: ReviewRating
  label: string
  shortcut: string
  className: string
}[] = [
  {
    key: 'again',
    label: 'わからなかった',
    shortcut: '←',
    className: 'border-[var(--destructive)] text-[var(--destructive)] hover:bg-[var(--destructive)]/10',
  },
  {
    key: 'good',
    label: 'わかった',
    shortcut: '→',
    className: 'bg-primary text-primary-foreground border-transparent hover:bg-primary/90',
  },
]

export function ReviewSession({
  deckId,
  initialStats,
}: {
  deckId: string
  initialStats: ReviewStats
}) {
  const [cards, setCards] = useState<OfflineDueCard[] | null>(null)
  // index: 現在表示中のカード位置。liveIndex: これから評価すべき「本来の」カード位置。
  // index < liveIndex のときは、過去に評価済みのカードを見返している状態。
  const [index, setIndex] = useState(0)
  const [liveIndex, setLiveIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [rating, setRating] = useState<ReviewRating | null>(null)
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0)
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)

  const loadCards = useCallback(async () => {
    await hydrateDeckCache(deckId)
    const due = await getCachedDueCards(deckId)
    setCards(due)
  }, [deckId])

  useEffect(() => {
    loadCards()
    setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine)

    function handleOnline() {
      setIsOffline(false)
      syncPendingReviews(deckId).catch(() => {})
    }
    function handleOffline() {
      setIsOffline(true)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [deckId, loadCards])

  const current = cards?.[index]
  const isReviewingPast = index < liveIndex
  const isDone = cards ? liveIndex >= cards.length && index >= liveIndex : false

  // サーバーから取得した「今日の復習数/連続日数」に、このセッション中に完了した分を
  // 即時反映する。今日まだ1件も復習していなかった状態から1件でも評価したら、
  // 連続日数は今日の分だけ+1する。
  const displayedTodayCount = initialStats.todayCount + sessionReviewedCount
  const displayedStreak =
    initialStats.streak + (sessionReviewedCount > 0 && initialStats.todayCount === 0 ? 1 : 0)

  const handleRate = useCallback(
    async (r: ReviewRating) => {
      if (!current || rating || isReviewingPast) return
      setRating(r)
      await applyReviewOffline(deckId, current.id, r)
      setSessionReviewedCount((c) => c + 1)
      setTimeout(() => {
        setIndex((i) => i + 1)
        setLiveIndex((i) => i + 1)
        setFlipped(false)
        setRating(null)
      }, 160)
    },
    [current, deckId, rating, isReviewingPast]
  )

  // カードをタップすると、問題⇄答えを何度でも行き来できる
  const handleFlip = useCallback(() => {
    setFlipped((f) => !f)
  }, [])

  const goToPrevious = useCallback(() => {
    if (index <= 0) return
    setIndex((i) => i - 1)
    setFlipped(true)
  }, [index])

  const goToNext = useCallback(() => {
    if (index >= liveIndex) return
    const next = index + 1
    setIndex(next)
    setFlipped(next < liveIndex)
  }, [index, liveIndex])

  const goToLive = useCallback(() => {
    setIndex(liveIndex)
    setFlipped(false)
  }, [liveIndex])

  // キーボードショートカット: Space/Enter でめくる、左右矢印キーで「わからなかった/わかった」を評価。
  // 過去カードの振り返り(前/次)はチェブロンボタンのクリック操作専用とし、矢印キーとは競合させない。
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!current) return
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        handleFlip()
        return
      }
      if (flipped && !isReviewingPast) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          handleRate('again')
          return
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          handleRate('good')
          return
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flipped, current, handleFlip, handleRate, isReviewingPast])

  if (cards === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">カードを準備しています...</p>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="animate-in fade-in duration-500 flex flex-col items-center gap-4 py-24 text-center">
        <ReviewStatsBar streak={displayedStreak} todayCount={displayedTodayCount} />
        <PartyPopper className="h-8 w-8 text-primary" strokeWidth={1.5} />
        <p className="font-heading text-lg font-bold">今日はここまで</p>
        <p className="text-sm text-muted-foreground">今復習するカードはありません。</p>
        <Button variant="outline" className="mt-2" onClick={() => router.push(`/decks/${deckId}`)}>
          デッキに戻る
        </Button>
      </div>
    )
  }

  if (isDone) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center gap-4 py-24 text-center">
        <ReviewStatsBar streak={displayedStreak} todayCount={displayedTodayCount} />
        <PartyPopper className="h-9 w-9 text-primary" strokeWidth={1.5} />
        <p className="font-heading text-xl font-bold">お疲れさまでした！</p>
        <p className="font-mono text-sm text-muted-foreground">{cards.length} 枚のカードを復習しました</p>
        <div className="mt-2 flex gap-2">
          {liveIndex > 0 && (
            <Button variant="outline" onClick={goToPrevious}>
              <RotateCcw className="mr-1 h-4 w-4" />
              振り返る
            </Button>
          )}
          <Button onClick={() => router.push(`/decks/${deckId}`)}>デッキに戻る</Button>
        </div>
      </div>
    )
  }

  const questionText =
    current!.cardType === 'cloze' && current!.clozeText
      ? renderClozeQuestion(current!.clozeText)
      : current!.front

  const answerText =
    current!.cardType === 'cloze' && current!.clozeText
      ? renderClozeAnswer(current!.clozeText)
      : current!.back

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <ReviewStatsBar streak={displayedStreak} todayCount={displayedTodayCount} />

      {isOffline && (
        <div className="animate-in fade-in flex items-center justify-center gap-2 rounded-md bg-muted py-2 text-sm text-muted-foreground">
          <WifiOff className="h-4 w-4" />
          オフラインです。復習結果は接続が戻り次第自動で送信されます。
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goToPrevious}
          disabled={index <= 0}
          aria-label="前の問題に戻る"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Progress value={(liveIndex / cards.length) * 100} className="h-1.5" />
        <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
          {index + 1} / {cards.length}
        </span>
      </div>

      {isReviewingPast && (
        <div className="animate-in fade-in slide-in-from-top-1 flex items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">
          <RotateCcw className="h-3.5 w-3.5" />
          振り返り中(評価済みのカードを確認しています)
          <button
            type="button"
            onClick={goToLive}
            className="ml-1 inline-flex items-center gap-0.5 font-medium underline underline-offset-2"
          >
            現在の問題に戻る
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* めくるカード本体: 3D flip (クリックで問題⇄答えを何度でも切り替え可能) */}
      <div
        className="relative w-full cursor-pointer select-none"
        style={{ perspective: '1600px' }}
        onClick={handleFlip}
      >
        <div
          ref={cardRef}
          key={current!.id}
          className="animate-in fade-in zoom-in-[0.98] relative min-h-[300px] w-full duration-300 transition-transform ease-[cubic-bezier(0.4,0.2,0.2,1)]"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transitionDuration: '500ms',
          }}
        >
          {/* 表面: 問題 */}
          <div
            className="absolute inset-0 flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="font-mono text-xs tracking-wide text-muted-foreground">Q</span>
            <p className="font-heading text-xl font-medium leading-relaxed whitespace-pre-wrap">
              {questionText}
            </p>
            {!flipped && (
              <span className="mt-4 text-xs text-muted-foreground">
                タップ / Space でめくる
              </span>
            )}
          </div>

          {/* 裏面: 答え */}
          <div
            className="absolute inset-0 flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-primary/30 bg-card p-8 text-center shadow-md"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <span className="font-mono text-xs tracking-wide text-primary">A</span>
            <p className="font-heading text-xl font-medium leading-relaxed whitespace-pre-wrap">
              {answerText}
            </p>
            {current!.note && (
              <>
                <div className="my-1 h-px w-12 bg-border" />
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{current!.note}</p>
              </>
            )}
            <span className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
              <RotateCcw className="h-3 w-3" />
              タップ / Space で問題に戻る
            </span>
          </div>
        </div>
      </div>

      {isReviewingPast ? (
        <Button variant="outline" className="w-full animate-in fade-in" size="lg" onClick={goToNext}>
          次のカードへ
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      ) : !flipped ? (
        <Button className="w-full" size="lg" onClick={handleFlip}>
          答えを見る
          <span className="ml-2 font-mono text-xs opacity-60">Space</span>
        </Button>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 grid grid-cols-2 gap-3">
          {RATING_CONFIG.map((r) => (
            <Button
              key={r.key}
              variant="outline"
              size="lg"
              disabled={rating !== null}
              onClick={() => handleRate(r.key)}
              className={`flex-col gap-0.5 border py-3 ${r.className} ${
                rating === r.key ? 'scale-95' : ''
              } transition-transform`}
            >
              <span>{r.label}</span>
              <span className="font-mono text-xs opacity-60">{r.shortcut}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
