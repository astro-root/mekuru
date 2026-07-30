'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { toast } from 'sonner'
import { WifiOff } from 'lucide-react'

export function ReviewSession({ deckId }: { deckId: string }) {
  const [cards, setCards] = useState<OfflineDueCard[] | null>(null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const router = useRouter()

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
  const isLast = cards ? index >= cards.length - 1 : false
  const isDone = cards ? index >= cards.length : false

  async function handleRate(rating: ReviewRating) {
    if (!current) return
    await applyReviewOffline(deckId, current.id, rating)
    setIndex((i) => i + 1)
    setFlipped(false)
  }

  if (cards === null) {
    return <p className="text-center text-muted-foreground py-16">読み込み中...</p>
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">今復習するカードはありません。</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push(`/decks/${deckId}`)}>
          デッキに戻る
        </Button>
      </div>
    )
  }

  if (isDone) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-lg font-medium">お疲れさまでした！</p>
        <p className="text-muted-foreground text-sm">{cards.length} 枚のカードを復習しました。</p>
        <Button onClick={() => router.push(`/decks/${deckId}`)}>デッキに戻る</Button>
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
    <div className="space-y-6">
      {isOffline && (
        <div className="flex items-center justify-center gap-2 rounded-md bg-muted py-2 text-sm text-muted-foreground">
          <WifiOff className="h-4 w-4" />
          オフラインです。復習結果は接続が戻り次第自動で送信されます。
        </div>
      )}

      <Progress value={(index / cards.length) * 100} />
      <p className="text-sm text-muted-foreground text-center">
        {index + 1} / {cards.length}
      </p>

      <Card className="min-h-[240px]">
        <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-medium whitespace-pre-wrap">{questionText}</p>
          {flipped && (
            <>
              <div className="w-full border-t" />
              <p className="text-lg whitespace-pre-wrap">{answerText}</p>
              {current!.note && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{current!.note}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {!flipped ? (
        <Button className="w-full" size="lg" onClick={() => setFlipped(true)}>
          答えを見る
        </Button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <Button variant="destructive" onClick={() => handleRate('again')}>
            もう一度
          </Button>
          <Button variant="outline" onClick={() => handleRate('hard')}>
            難しい
          </Button>
          <Button variant="secondary" onClick={() => handleRate('good')}>
            普通
          </Button>
          <Button variant="default" onClick={() => handleRate('easy')}>
            簡単
          </Button>
        </div>
      )}
    </div>
  )
}
