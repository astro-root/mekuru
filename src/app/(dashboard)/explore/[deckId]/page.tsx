import type { Metadata } from "next";
import { notFound } from 'next/navigation'
import { getPublicDeckWithCards } from '@/lib/actions/decks'
import { ExplorePreviewActions } from '@/components/deck/explore-preview-actions'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: "公開デッキのプレビュー",
}

export default async function ExploreDeckPreviewPage({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
  const { deckId } = await params
  const result = await getPublicDeckWithCards(deckId)
  if (!result) notFound()

  const { deck, cards } = result

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold">{deck.name}</h1>
        {deck.description && (
          <p className="mt-1 text-sm text-muted-foreground">{deck.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-mono">
            {cards.length}枚
          </Badge>
          {deck.genre && <Badge variant="secondary">{deck.genre}</Badge>}
        </div>
      </div>

      <ExplorePreviewActions deckId={deck.id} />

      <div className="space-y-2">
        {cards.slice(0, 20).map((card) => (
          <div key={card.id} className="rounded-lg border border-border bg-card p-3">
            <p className="text-sm font-medium">{card.front}</p>
            <p className="mt-1 text-sm text-muted-foreground">{card.back}</p>
          </div>
        ))}
        {cards.length > 20 && (
          <p className="pt-2 text-center text-xs text-muted-foreground">
            他 {cards.length - 20} 枚は複製後に確認できます
          </p>
        )}
      </div>
    </div>
  )
}
