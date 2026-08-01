import type { Metadata } from "next";
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDeck } from '@/lib/actions/decks'
import { getCards } from '@/lib/actions/cards'
import { Button } from '@/components/ui/button'
import { CardFormDialog } from '@/components/deck/card-form-dialog'
import { CardRow } from '@/components/deck/card-row'
import { ArrowLeft, Plus, BookOpen, Layers } from 'lucide-react'
import { ExportMenu } from '@/components/import-export/export-menu'
import { ImportDialog } from '@/components/import-export/import-dialog'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ deckId: string }>
}): Promise<Metadata> {
  const { deckId } = await params
  try {
    const deck = await getDeck(deckId)
    return { title: deck?.name ?? "デッキ" }
  } catch {
    return { title: "デッキ" }
  }
}

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
  const { deckId } = await params

  let deck
  try {
    deck = await getDeck(deckId)
  } catch {
    notFound()
  }
  if (!deck) notFound()

  const cards = await getCards(deckId)

  return (
    <div className="space-y-6">
      <Link
        href="/decks"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        デッキ一覧に戻る
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold">{deck.name}</h1>
          <p className="mt-0.5 font-mono text-sm text-muted-foreground">
            {cards.length} 枚のカード
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/review/${deckId}`}>
            <Button size="sm" variant="outline">
              <BookOpen className="mr-1 h-4 w-4" />
              めくって学習する
            </Button>
          </Link>
          <ImportDialog deckId={deckId} />
          <ExportMenu deckId={deckId} deckName={deck.name} cards={cards} />
          <CardFormDialog
            deckId={deckId}
            trigger={
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                カードを追加
              </Button>
            }
          />
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Layers className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">
            まだカードがありません。最初のカードを追加しましょう。
          </p>
          <CardFormDialog
            deckId={deckId}
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="mr-1 h-4 w-4" />
                最初のカードを追加
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map((card) => (
            <CardRow key={card.id} deckId={deckId} card={card} />
          ))}
        </div>
      )}
    </div>
  )
}
