'use client'

import { useMemo, useState } from 'react'
import { Search, X, Layers } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { CardRow } from '@/components/deck/card-row'
import { CardFormDialog } from '@/components/deck/card-form-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

type CardItem = {
  id: string
  front: string
  back: string
  card_type: string
  cloze_text: string | null
  note: string | null
}

export function CardListSearch({ deckId, cards }: { deckId: string; cards: CardItem[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cards
    return cards.filter((c) => {
      const haystack = [c.front, c.back, c.cloze_text ?? '', c.note ?? ''].join('\n').toLowerCase()
      return haystack.includes(q)
    })
  }, [cards, query])

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="表・裏・コメントを検索"
          className="pl-8 pr-8"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="検索をクリア"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {query && (
        <p className="font-mono text-xs text-muted-foreground">
          {filtered.length} / {cards.length} 件表示中
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Layers className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">「{query}」に一致するカードが見つかりませんでした。</p>
          <Button size="sm" variant="outline" onClick={() => setQuery('')}>
            検索をクリア
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((card) => (
            <CardRow key={card.id} deckId={deckId} card={card} />
          ))}
        </div>
      )}
    </div>
  )
}

// カードが0件の場合の空状態(検索欄自体を出す意味がないため専用に用意)
export function EmptyDeckState({ deckId }: { deckId: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <Layers className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground">まだカードがありません。最初のカードを追加しましょう。</p>
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
  )
}
