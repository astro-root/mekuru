'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Compass, Copy } from 'lucide-react'
import { cloneDeck, type PublicDeck } from '@/lib/actions/decks'
import { toast } from 'sonner'

export function ExploreList({ decks }: { decks: PublicDeck[] }) {
  const [query, setQuery] = useState('')
  const [cloningId, setCloningId] = useState<string | null>(null)
  const router = useRouter()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return decks
    return decks.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.genre?.toLowerCase().includes(q)
    )
  }, [decks, query])

  async function handleClone(deckId: string) {
    setCloningId(deckId)
    const result = await cloneDeck(deckId)
    setCloningId(null)

    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('デッキを自分の一覧に追加しました')
    if (result?.deckId) {
      router.push(`/decks/${result.deckId}`)
    }
  }

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <Compass className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">
          まだ公開されているデッキがありません。自分のデッキを公開してみましょう。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="デッキ名・ジャンルで検索"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          該当するデッキが見つかりませんでした。
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((deck) => (
            <div
              key={deck.id}
              className="flex h-full flex-col rounded-xl border border-border bg-card p-4"
            >
              <Link href={`/explore/${deck.id}`} className="min-w-0 flex-1">
                <h3 className="font-heading text-base font-bold truncate">{deck.name}</h3>
                {deck.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {deck.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-mono">
                    {deck.cardCount}枚
                  </Badge>
                  {deck.genre && <Badge variant="secondary">{deck.genre}</Badge>}
                </div>
              </Link>
              <Button
                size="sm"
                className="mt-3"
                disabled={cloningId === deck.id}
                onClick={() => handleClone(deck.id)}
              >
                <Copy className="mr-1 h-4 w-4" />
                {cloningId === deck.id ? '複製中...' : 'このデッキを使う'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
