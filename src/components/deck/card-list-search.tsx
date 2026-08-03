'use client'

import { useMemo, useState } from 'react'
import { Search, X, Layers, Star } from 'lucide-react'
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
  tags?: { id: string; name: string }[]
  is_favorite?: boolean
  is_suspended?: boolean
}

export function CardListSearch({ deckId, cards }: { deckId: string; cards: CardItem[] }) {
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [showSuspended, setShowSuspended] = useState(true)

  const allTagNames = useMemo(() => {
    const names = new Set<string>()
    for (const c of cards) {
      for (const t of c.tags ?? []) names.add(t.name)
    }
    return Array.from(names).sort()
  }, [cards])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cards.filter((c) => {
      if (favoriteOnly && !c.is_favorite) return false
      if (!showSuspended && c.is_suspended) return false
      if (activeTag && !(c.tags ?? []).some((t) => t.name === activeTag)) return false
      if (!q) return true
      const tagNames = (c.tags ?? []).map((t) => t.name).join('\n')
      const haystack = [c.front, c.back, c.cloze_text ?? '', c.note ?? '', tagNames]
        .join('\n')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [cards, query, activeTag, favoriteOnly, showSuspended])

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="表・裏・コメント・タグを検索"
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

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFavoriteOnly((v) => !v)}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs transition-colors ${
            favoriteOnly
              ? 'bg-secondary text-secondary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          }`}
        >
          <Star className="h-3 w-3" fill={favoriteOnly ? 'currentColor' : 'none'} />
          お気に入りのみ
        </button>
        <button
          type="button"
          onClick={() => setShowSuspended((v) => !v)}
          className={`rounded-full px-2.5 py-1 font-mono text-xs transition-colors ${
            showSuspended
              ? 'bg-muted text-muted-foreground hover:bg-muted/70'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          {showSuspended ? '非表示カードも表示中' : '非表示カードを隠しています'}
        </button>
      </div>

      {allTagNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTagNames.map((name) => {
            const active = activeTag === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => setActiveTag(active ? null : name)}
                className={`rounded-full px-2.5 py-1 font-mono text-xs transition-colors ${
                  active
                    ? 'bg-secondary text-secondary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {name}
              </button>
            )
          })}
        </div>
      )}

      {(query || activeTag || favoriteOnly || !showSuspended) && (
        <p className="font-mono text-xs text-muted-foreground">
          {filtered.length} / {cards.length} 件表示中
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Layers className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">
            {query ? `「${query}」に一致するカードが見つかりませんでした。` : '一致するカードが見つかりませんでした。'}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setQuery('')
              setActiveTag(null)
              setFavoriteOnly(false)
              setShowSuspended(true)
            }}
          >
            絞り込みをクリア
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
