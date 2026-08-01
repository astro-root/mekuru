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
import {
  WifiOff,
  PartyPopper,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Shuffle,
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

const SWIPE_COMMIT_THRESHOLD = 90 // これ以上動かすとその場で評価が確定する
const SWIPE_DIRECTION_RATIO = 1.5 // 横移動が縦移動よりこの倍率以上大きければ「横スワイプ」とみなす

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function orderModeStorageKey(deckId: string) {
  return `mekuru:order-mode:${deckId}`
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
  const [rating, setRating] = useState<ReviewRating | null>(null)
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0)
  const [orderMode, setOrderMode] = useState<OrderMode>('sequential')
  const [dragX, setDragX] = useState(0) // スワイプ中のカードの横方向オフセット(px)
  const [isDragging, setIsDragging] = useState(false)
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  const loadCards = useCallback(async () => {
    await hydrateDeckCache(deckId)
    const due = await getCachedDueCards(deckId) // 既定でposition昇順(=登録順)

    let storedMode: OrderMode = 'sequential'
    try {
      const saved = localStorage.getItem(orderModeStorageKey(deckId))
      if (saved === 'random' || saved === 'sequential') storedMode = saved
    } catch {
      // localStorageが使えない環境ではデフォルト(順番通り)を使う
    }
    setOrderMode(storedMode)
    setCards(storedMode === 'random' ? shuffle(due) : due)
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

  // 出題順(順番通り/ランダム)の切り替え。既に評価済みのカード(0〜liveIndex-1)は
  // そのままにし、これから出題する分(liveIndex以降)だけ並び替える。
  const changeOrderMode = useCallback(
    (mode: OrderMode) => {
      setOrderMode(mode)
      try {
        localStorage.setItem(orderModeStorageKey(deckId), mode)
      } catch {
        // 保存に失敗しても致命的ではないので無視する
      }
      setCards((prev) => {
        if (!prev) return prev
        const reviewed = prev.slice(0, liveIndex)
        const remaining = prev.slice(liveIndex)
        const reordered =
          mode === 'random' ? shuffle(remaining) : [...remaining].sort((a, b) => a.position - b.position)
        return [...reviewed, ...reordered]
      })
    },
    [deckId, liveIndex]
  )

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
        setDragX(0)
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

  // ポインター(マウス/タッチ)操作。答えを見た状態でのみ、カードが指に追従して
  // 傾き・色付けされ、どちら向きにスワイプしているか一目で分かるようにする。
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

  const answerText =
    current!.cardType === 'cloze' && current!.clozeText
      ? renderClozeAnswer(current!.clozeText)
      : current!.back

  // ドラッグ量に応じた視覚フィードバック
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

      {/* めくるカード本体: 3D flip。タップでめくる、答えを見た状態での横スワイプで評価。
          ドラッグ中はカードが指に追従して傾き、方向に応じた色のオーバーレイが出る。 */}
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
            className="absolute inset-0 flex min-h-[300px] flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-primary/30 bg-card p-8 text-center shadow-md"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            {/* スワイプ方向のフィードバック(左=わからなかった、右=わかった) */}
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
              <span className="font-mono text-xs opacity-60">{r.shortcut}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
