import type { Metadata } from "next";
import { getDecks } from '@/lib/actions/decks'
import { getDueCountsByDeck } from '@/lib/actions/reviews'
import { getReviewStats } from '@/lib/actions/reviews'
import { Button } from '@/components/ui/button'
import { DeckFormDialog } from '@/components/deck/deck-form-dialog'
import { DeckList } from '@/components/deck/deck-list'
import { Plus, Layers, Flame } from 'lucide-react'

export const metadata: Metadata = {
  title: "デッキ一覧",
}

export default async function DecksPage() {
  const [decks, dueCounts, stats] = await Promise.all([
    getDecks(),
    getDueCountsByDeck(),
    getReviewStats(),
  ])
  const totalDue = Object.values(dueCounts).reduce((sum, n) => sum + n, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">デッキ一覧</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {decks.length > 0 ? `${decks.length} 個のデッキ` : '今日から始めましょう'}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {totalDue > 0 && (
              <p className="font-mono text-sm font-bold text-primary">
                今日の復習: {totalDue}枚
              </p>
            )}
            {stats.streak > 0 && (
              <p className="flex items-center gap-1 font-mono text-sm font-bold text-accent-foreground">
                <Flame className="h-3.5 w-3.5" strokeWidth={2} />
                {stats.streak}日連続
              </p>
            )}
          </div>
        </div>
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
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Layers className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">
            まだデッキがありません。最初のデッキを作って、めくり始めましょう。
          </p>
          <DeckFormDialog
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="mr-1 h-4 w-4" />
                最初のデッキを作る
              </Button>
            }
          />
        </div>
      ) : (
        <DeckList decks={decks} dueCounts={dueCounts} />
      )}
    </div>
  )
}
