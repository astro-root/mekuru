import Link from 'next/link'
import type { StrugglingCard } from '@/lib/actions/reviews'
import { Target } from 'lucide-react'

export function StrugglingCardList({ cards }: { cards: StrugglingCard[] }) {
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <Target className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">
          今のところ、間違えやすいカードは見つかりませんでした。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {cards.map((card) => (
        <Link
          key={card.cardId}
          href={`/decks/${card.deckId}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/20"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{card.front}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.deckName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 font-mono text-xs text-muted-foreground">
            {card.lapses > 0 && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                間違い {card.lapses}回
              </span>
            )}
            <span>難易度 {card.difficulty.toFixed(1)}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
