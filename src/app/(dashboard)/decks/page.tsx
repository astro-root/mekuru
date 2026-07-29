import Link from 'next/link'
import { getDecks } from '@/lib/actions/decks'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DeckFormDialog } from '@/components/deck/deck-form-dialog'
import { DeckActionsMenu } from '@/components/deck/deck-actions-menu'
import { Plus } from 'lucide-react'

export default async function DecksPage() {
  const decks = await getDecks()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">デッキ一覧</h1>
        <DeckFormDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              新しいデッキ
            </Button>
          }
        />
      </div>

      {decks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          まだデッキがありません。最初のデッキを作成しましょう。
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {decks.map((deck) => (
            <Link key={deck.id} href={`/decks/${deck.id}`}>
              <Card className="h-full hover:border-foreground/30 transition-colors">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">{deck.name}</CardTitle>
                    {deck.description && (
                      <CardDescription className="mt-1">{deck.description}</CardDescription>
                    )}
                    <div className="flex gap-2 mt-2">
                      {deck.genre && <Badge variant="secondary">{deck.genre}</Badge>}
                      <Badge variant="outline">難易度 {deck.difficulty}</Badge>
                    </div>
                  </div>
                  <DeckActionsMenu deck={deck} />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
