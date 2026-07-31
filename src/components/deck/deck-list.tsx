'use client'

import { useMemo, useState } from 'react'
import { DeckCard } from './deck-card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, Layers, X } from 'lucide-react'

type Deck = {
  id: string
  name: string
  description: string | null
  genre: string | null
  difficulty: number
  updated_at: string
}

type SortKey = 'updated_desc' | 'name_asc' | 'difficulty_desc' | 'difficulty_asc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'updated_desc', label: '更新が新しい順' },
  { value: 'name_asc', label: '名前順' },
  { value: 'difficulty_desc', label: '難易度が高い順' },
  { value: 'difficulty_asc', label: '難易度が低い順' },
]

export function DeckList({ decks }: { decks: Deck[] }) {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('updated_desc')

  const genres = useMemo(() => {
    const set = new Set<string>()
    decks.forEach((d) => {
      if (d.genre) set.add(d.genre)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'))
  }, [decks])

  const filtered = useMemo(() => {
    let list = decks

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.description ?? '').toLowerCase().includes(q)
      )
    }
    if (genre !== 'all') {
      list = list.filter((d) => d.genre === genre)
    }

    const sorted = [...list]
    switch (sort) {
      case 'name_asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
        break
      case 'difficulty_desc':
        sorted.sort((a, b) => b.difficulty - a.difficulty)
        break
      case 'difficulty_asc':
        sorted.sort((a, b) => a.difficulty - b.difficulty)
        break
      default:
        sorted.sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
    }
    return sorted
  }, [decks, query, genre, sort])

  const hasActiveFilters = query.trim() !== '' || genre !== 'all'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="デッキ名・説明で検索"
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          {genres.length > 0 && (
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="w-36 shrink-0">
                <SelectValue placeholder="ジャンル" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのジャンル</SelectItem>
                {genres.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[9.5rem] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => {
                setQuery('')
                setGenre('all')
              }}
              aria-label="フィルタをクリア"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <p className="font-mono text-xs text-muted-foreground">
          {filtered.length} / {decks.length} 件を表示
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
          <Layers className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">条件に一致するデッキが見つかりません</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  )
}
