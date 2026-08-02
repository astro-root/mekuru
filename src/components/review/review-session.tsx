'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { renderClozeQuestion, renderClozeAnswer } from '@/lib/cloze'
import { toast } from 'sonner'
import {
  hydrateDeckCache,
  getCachedDueCards,
  getCachedCardsByIds,
  applyReviewOffline,
  undoLastReviewOffline,
  syncPendingReviews,
  getPendingReviewCount,
  getIntervalPreview,
  type OfflineDueCard,
  type AppliedReview,
} from '@/lib/offline/sync'
import type { ReviewRating } from '@/lib/fsrs/scheduler'
import type { ReviewStats } from '@/lib/actions/reviews'
import { ReviewStatsBar } from './review-stats-bar'
import {
  WifiOff,
  PartyPopper,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Shuffle,
  Zap,
} from 'lucide-react'

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

type OrderMode = 'sequential' | 'random'

type SessionSnapshot = {
  date: string
  cardIds: string[]
  liveIndex: number
  orderMode: OrderMode
}

const SWIPE_COMMIT_THRESHOLD = 90
const SWIPE_DIRECTION_RATIO = 1.5

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// 「今日」の判定はサーバー側(getReviewStats)と同じくJST基準に揃える
function todayJstStr(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function snapshotKey(deckId: string) {
  return `mekuru:session:${deckId}`
}

function readSnapshot(deckId: string): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(snapshotKey(deckId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed.date === 'string' &&
      Array.isArray(parsed.cardIds) &&
      typeof parsed.liveIndex === 'number' &&
      (parsed.orderMode === 'sequential' || parsed.orderMode === 'random')
    ) {
      return parsed as SessionSnapshot
    }
    return null
  } catch {
    return null
  }
}

function writeSnapshot(deckId: string, snapshot: SessionSnapshot) {
  try {
    localStorage.setItem(snapshotKey(deckId), JSON.stringify(snapshot))
  } catch {
    // 保存できなくても致命的ではないので無視する
  }
}

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
  const [pendingReviewCount, setPendingReviewCount] = useState(0)
  const lastAppliedRef = useRef<{ cardId: string; applied: AppliedReview } | null>(null)
  const [rating, setRating] = useState<ReviewRating | null>(null)
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0)
  const [orderMode, setOrderMode] = useState<OrderMode>('sequential')
  const [quizRevealMode, setQuizRevealMode] = useState(false)
  const [revealedChars, setRevealedChars] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  // その日(JST)の出題バッチが既にあれば、番号・分母を引き継いで再開する。
  // 日付が変わっていれば、その日ぶんの新しいバッチを作り直す。
  const loadCards = useCallback(async () => {
    await hydrateDeckCache(deckId)

    const today = todayJstStr()
    const snapshot = readSnapshot(deckId)

    if (snapshot && snapshot.date === today) {
      const restored = await getCachedCardsByIds(deckId, snapshot.cardIds)
      const resumeAt = Math.min(snapshot.liveIndex, restored.length)
      setOrderMode(snapshot.orderMode)
      setCards(restored)
      setLiveIndex(resumeAt)
      setIndex(resumeAt)
      return
    }

    // 出題順の好みは日をまたいでも引き継ぐ
    const preferredOrderMode: OrderMode = snapshot?.orderMode ?? 'sequential'
    const due = await getCachedDueCards(deckId) // 既定でposition昇順(=登録順)
    const ordered = preferredOrderMode === 'random' ? shuffle(due) : due

    setOrderMode(preferredOrderMode)
    setCards(ordered)
    setLiveIndex(0)
    setIndex(0)
    writeSnapshot(deckId, {
      date: today,
      cardIds: ordered.map((c) => c.id),
      liveIndex: 0,
      orderMode: preferredOrderMode,
    })
  }, [deckId])

  useEffect(() => {
    loadCards()
    setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine)

    function refreshPendingCount() {
      getPendingReviewCount(deckId)
        .then(setPendingReviewCount)
        .catch(() => {})
    }
    refreshPendingCount()

    function handleOnline() {
      setIsOffline(false)
      syncPendingReviews(deckId)
        .then(() => refreshPendingCount())
        .catch(() => {})
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
  const intervalPreview = current ? getIntervalPreview(current.fsrsState) : null
  const isReviewingPast = index < liveIndex
  const isDone = cards ? liveIndex >= cards.length && index >= liveIndex : false

  // 出題順(順番通り/ランダム)の切り替え。既に評価済みのカード(0〜liveIndex-1)は
  // そのままにし、これから出題する分(liveIndex以降)だけ並び替える。バッチの保存内容も更新する。
  const changeOrderMode = useCallback(
    (mode: OrderMode) => {
      setOrderMode(mode)
      setCards((prev) => {
        if (!prev) return prev
        const reviewed = prev.slice(0, liveIndex)
        const remaining = prev.slice(liveIndex)
        const reordered =
          mode === 'random' ? shuffle(remaining) : [...remaining].sort((a, b) => a.position - b.position)
        const next = [...reviewed, ...reordered]
        writeSnapshot(deckId, {
          date: todayJstStr(),
          cardIds: next.map((c) => c.id),
          liveIndex,
          orderMode: mode,
        })
        return next
      })
    },
    [deckId, liveIndex]
  )

  const displayedTodayCount = initialStats.todayCount + sessionReviewedCount
  const displayedStreak =
    initialStats.streak + (sessionReviewedCount > 0 && initialStats.todayCount === 0 ? 1 : 0)

  const handleUndo = useCallback(async () => {
    const last = lastAppliedRef.current
    if (!last) return
    lastAppliedRef.current = null

    const { error } = await undoLastReviewOffline(deckId, last.cardId, last.applied)
    if (error) toast.error(error)
    else toast.success('評価を取り消しました')

    setSessionReviewedCount((c) => Math.max(0, c - 1))
    setIndex((i) => Math.max(0, i - 1))
    setLiveIndex((i) => {
      const next = Math.max(0, i - 1)
      setCards((prev) => {
        if (!prev) return prev
        writeSnapshot(deckId, {
          date: todayJstStr(),
          cardIds: prev.map((c) => c.id),
          liveIndex: next,
          orderMode,
        })
        return prev
      })
      return next
    })
    setFlipped(false)
    setRating(null)
    getPendingReviewCount(deckId)
      .then(setPendingReviewCount)
      .catch(() => {})
  }, [deckId, orderMode])

  const handleRate = useCallback(
    async (r: ReviewRating) => {
      if (!current || rating || isReviewingPast || !cards) return
      setRating(r)
      const applied = await applyReviewOffline(deckId, current.id, r)
      lastAppliedRef.current = { cardId: current.id, applied }
      setSessionReviewedCount((c) => c + 1)
      getPendingReviewCount(deckId)
        .then(setPendingReviewCount)
        .catch(() => {})

      toast('評価を記録しました', {
        action: {
          label: '取り消す',
          onClick: () => handleUndo(),
        },
        duration: 6000,
      })

      const nextLiveIndex = liveIndex + 1
      // 中断して戻った時に番号・分母を引き継げるよう、評価の都度バッチの進捗を保存する
      writeSnapshot(deckId, {
        date: todayJstStr(),
        cardIds: cards.map((c) => c.id),
        liveIndex: nextLiveIndex,
        orderMode,
      })

      setTimeout(() => {
        setIndex((i) => i + 1)
        setLiveIndex(nextLiveIndex)
        setFlipped(false)
        setRating(null)
        setDragX(0)
      }, 160)
    },
    [current, deckId, rating, isReviewingPast, cards, liveIndex, orderMode, handleUndo]
  )

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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      pointerStart.current = { x: e.clientX, y: e.clientY }
      if (flipped && !isReviewingPast) setIsDragging(true)
    },
    [flipped, isReviewingPast]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = pointerStart.current
      if (!start || !flipped || isReviewingPast) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (Math.abs(dx) > Math.abs(dy) * SWIPE_DIRECTION_RATIO) {
        setDragX(dx)
      }
    },
    [flipped, isReviewingPast]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = pointerStart.current
      pointerStart.current = null
      setIsDragging(false)
      if (!start) return

      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      if (absDx > SWIPE_COMMIT_THRESHOLD && absDx > absDy * SWIPE_DIRECTION_RATIO) {
        if (flipped && !isReviewingPast) {
          handleRate(dx < 0 ? 'again' : 'good')
          return
        }
      }

      setDragX(0)
      if (absDx <= 8 && absDy <= 8) {
        handleFlip()
      }
    },
    [flipped, isReviewingPast, handleRate, handleFlip]
  )

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

  const revealTargetText = current
    ? current.cardType === 'cloze' && current.clozeText
      ? renderClozeQuestion(current.clozeText)
      : current.front
    : ''

  useEffect(() => {
    if (!quizRevealMode || !current) return
    const total = revealTargetText.length
    const shouldReveal = !flipped && !isReviewingPast && total > 0

    const resetTimer = setTimeout(() => setRevealedChars(0), 0)
    if (!shouldReveal) return () => clearTimeout(resetTimer)

    const id = setInterval(() => {
      setRevealedChars((n) => {
        if (n + 1 >= total) {
          clearInterval(id)
          return total
        }
        return n + 1
      })
    }, 90)
    return () => {
      clearTimeout(resetTimer)
      clearInterval(id)
    }
  }, [quizRevealMode, current, flipped, isReviewingPast, revealTargetText])

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
        <p className="text-sm text-muted-foreground">今学習するカードはありません。</p>
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
        <p className="font-mono text-sm text-muted-foreground">{cards.length} 枚のカードを学習しました</p>
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

  const displayedQuestionText =
    quizRevealMode && !flipped && !isReviewingPast ? questionText.slice(0, revealedChars) : questionText
  const isRevealing = quizRevealMode && !flipped && !isReviewingPast && revealedChars < questionText.length

  const answerText =
    current!.cardType === 'cloze' && current!.clozeText
      ? renderClozeAnswer(current!.clozeText)
      : current!.back

  const dragProgress = Math.min(Math.abs(dragX) / SWIPE_COMMIT_THRESHOLD, 1)
  const dragRotation = Math.max(-12, Math.min(12, dragX / 12))
  const showAgainOverlay = dragX < -12
  const showGoodOverlay = dragX > 12

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <ReviewStatsBar streak={displayedStreak} todayCount={displayedTodayCount} />

      {isOffline && (
        <div className="animate-in fade-in flex items-center justify-center gap-2 rounded-md bg-muted py-2 text-sm text-muted-foreground">
          <WifiOff className="h-4 w-4" />
          オフラインです。学習結果は接続が戻り次第自動で送信されます。
        </div>
      )}

      {!isOffline && pendingReviewCount > 0 && (
        <div className="animate-in fade-in flex items-center justify-center gap-2 rounded-md bg-muted py-2 text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">{pendingReviewCount}</span>
          <span>件の学習結果を送信中です...</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
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

        <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-border p-0.5">
          <button
            type="button"
            onClick={() => changeOrderMode('sequential')}
            aria-label="順番通りに出題"
            title="順番通り"
            className={`flex h-6 items-center gap-1 rounded px-1.5 text-xs transition-colors ${
              orderMode === 'sequential'
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => changeOrderMode('random')}
            aria-label="ランダムに出題"
            title="ランダム"
            className={`flex h-6 items-center gap-1 rounded px-1.5 text-xs transition-colors ${
              orderMode === 'random'
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Shuffle className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setQuizRevealMode((v) => !v)}
            aria-label="早押し表示(問題文を少しずつ表示)"
            title="早押し表示"
            className={`flex h-6 items-center gap-1 rounded px-1.5 text-xs transition-colors ${
              quizRevealMode
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
          </button>
        </div>
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

      <div
        className="relative w-full cursor-pointer select-none touch-pan-y"
        style={{ perspective: '1600px' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStart.current = null
          setIsDragging(false)
          setDragX(0)
        }}
      >
        <div
          ref={cardRef}
          key={current!.id}
          className="animate-in fade-in zoom-in-[0.98] relative min-h-[300px] w-full duration-300"
          style={{
            transformStyle: 'preserve-3d',
            transform: `translateX(${dragX}px) rotate(${dragRotation}deg) rotateY(${flipped ? 180 : 0}deg)`,
            transition: isDragging ? 'none' : 'transform 500ms cubic-bezier(0.4,0.2,0.2,1)',
          }}
        >
          <div
            className="absolute inset-0 flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="font-mono text-xs tracking-wide text-muted-foreground">Q</span>
            <p className="font-heading text-xl font-medium leading-relaxed whitespace-pre-wrap">
              {displayedQuestionText}
              {isRevealing && <span className="animate-pulse">▏</span>}
            </p>
            {!flipped && (
              <span className="mt-4 text-xs text-muted-foreground">
                {isRevealing ? 'わかったら タップ / Space でめくる' : 'タップ / Space でめくる'}
              </span>
            )}
          </div>

          <div
            className="absolute inset-0 flex min-h-[300px] flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-primary/30 bg-card p-8 text-center shadow-md"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-start bg-[var(--destructive)] px-6 text-lg font-bold text-white transition-opacity"
              style={{ opacity: showAgainOverlay ? dragProgress * 0.9 : 0 }}
            >
              わからなかった
            </div>
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-end bg-primary px-6 text-lg font-bold text-primary-foreground transition-opacity"
              style={{ opacity: showGoodOverlay ? dragProgress * 0.9 : 0 }}
            >
              わかった
            </div>

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
            {!isReviewingPast && (
              <span className="mt-4 text-xs text-muted-foreground">
                左右にスワイプ、または ←/→ キーで評価
              </span>
            )}
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
              {intervalPreview && (
                <span className="font-mono text-[11px] opacity-70">次: {intervalPreview[r.key]}</span>
              )}
              <span className="font-mono text-xs opacity-60">{r.shortcut}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
