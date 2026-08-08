import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { DeckActionsMenu } from './deck-actions-menu'
import { ChevronRight } from 'lucide-react'

type Deck = {
  id: string
  name: string
  description: string | null
  genre: string | null
  difficulty: number
  new_cards_per_day: number | null
  is_public?: boolean
}

export function DeckCard({ deck, dueCount = 0 }: { deck: Deck; dueCount?: number }) {
  return (
    <div
      className="group relative h-full border border-border bg-card p-4 pr-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{
        clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div
        className="absolute right-0 top-0 h-[18px] w-[18px] bg-muted transition-all duration-200 ease-out group-hover:h-[26px] group-hover:w-[26px]"
        style={{
          clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
          boxShadow: 'inset -2px -2px 3px rgba(28,33,48,0.10)',
        }}
      />

      <Link href={`/decks/${deck.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-heading text-base font-bold truncate">{deck.name}</h3>
            {deck.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {deck.description}
              </p>
            )}
          </div>
          <DeckActionsMenu deck={deck} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {dueCount > 0 && (
            <Badge className="font-mono tabular-nums">今日 {dueCount}枚</Badge>
          )}
          {deck.is_public && <Badge variant="secondary">公開中</Badge>}
          {deck.genre && <Badge variant="secondary">{deck.genre}</Badge>}
          <div className="flex items-center gap-1" title={`難易度 ${deck.difficulty} / 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i < deck.difficulty ? 'bg-primary' : 'bg-border'
                }`}
              />
            ))}
          </div>
        </div>
      </Link>

      <Link
        href={`/review/${deck.id}`}
        className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
      >
        めくって学習する
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
