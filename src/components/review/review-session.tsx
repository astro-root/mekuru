'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { submitReview } from '@/lib/actions/reviews'
import { renderClozeQuestion, renderClozeAnswer } from '@/lib/cloze'
import type { DueCard } from '@/lib/actions/reviews'
import type { ReviewRating } from '@/lib/fsrs/scheduler'
import { toast } from 'sonner'

export function ReviewSession({ deckId, cards }: { deckId: string; cards: DueCard[] }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  const current = cards[index]
  const isLast = index >= cards.length - 1
  const isDone = index >= cards.length

  async function handleRate(rating: ReviewRating) {
    if (!current || isPending) return
    setIsPending(true)
    const result = await submitReview(deckId, current.id, rating)
    setIsPending(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }
    if (isLast) {
      setIndex(index + 1)
    } else {
      setIndex(index + 1)
      setFlipped(false)
    }
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
    current.card_type === 'cloze' && current.cloze_text
      ? renderClozeQuestion(current.cloze_text)
      : current.front

  const answerText =
    current.card_type === 'cloze' && current.cloze_text
      ? renderClozeAnswer(current.cloze_text)
      : current.back

  return (
    <div className="space-y-6">
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
          <Button variant="destructive" disabled={isPending} onClick={() => handleRate('again')}>
            もう一度
          </Button>
          <Button variant="outline" disabled={isPending} onClick={() => handleRate('hard')}>
            難しい
          </Button>
          <Button variant="secondary" disabled={isPending} onClick={() => handleRate('good')}>
            普通
          </Button>
          <Button variant="default" disabled={isPending} onClick={() => handleRate('easy')}>
            簡単
          </Button>
        </div>
      )}
    </div>
  )
}
