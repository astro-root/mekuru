'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'
import { cloneDeck } from '@/lib/actions/decks'
import { toast } from 'sonner'

export function ExplorePreviewActions({ deckId }: { deckId: string }) {
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function handleClone() {
    setIsPending(true)
    const result = await cloneDeck(deckId)
    setIsPending(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('デッキを自分の一覧に追加しました')
    if (result?.deckId) {
      router.push(`/decks/${result.deckId}`)
    }
  }

  return (
    <Button onClick={handleClone} disabled={isPending}>
      <Copy className="mr-1 h-4 w-4" />
      {isPending ? '複製中...' : 'このデッキを使う'}
    </Button>
  )
}
