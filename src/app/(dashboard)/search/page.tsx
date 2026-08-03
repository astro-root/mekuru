'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Search as SearchIcon, X, Layers } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { searchCardsAcrossDecks, type CardSearchResult } from '@/lib/actions/cards'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CardSearchResult[] | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleChange(value: string) {
    setQuery(value)
    const q = value.trim()
    if (q.length === 0) {
      setResults(null)
      return
    }
    startTransition(async () => {
      const r = await searchCardsAcrossDecks(q)
      setResults(r)
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-bold">デッキ横断検索</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          全てのデッキから、カードの表・裏・コメントを検索します。
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="キーワードを入力(例: 量子)"
          className="pl-8 pr-8"
          autoFocus
        />
        {query && (
          <button
            type="button"
            onClick={() => handleChange('')}
            aria-label="検索をクリア"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isPending && <p className="text-xs text-muted-foreground">検索中...</p>}

      {!isPending && results !== null && (
        <>
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
              <Layers className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">「{query}」に一致するカードが見つかりませんでした。</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((card) => (
                <Link
                  key={card.id}
                  href={`/decks/${card.deckId}`}
                  className="block rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/20"
                >
                  <p className="truncate text-sm font-medium">{card.front}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.back}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{card.deckName}</p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
