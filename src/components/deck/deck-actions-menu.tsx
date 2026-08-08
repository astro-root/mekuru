'use client'

import { useRouter } from 'next/navigation'
import { MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeckFormDialog } from './deck-form-dialog'
import { deleteDeck } from '@/lib/actions/decks'
import { toast } from 'sonner'

type Deck = {
  id: string
  name: string
  description: string | null
  genre: string | null
  difficulty: number
  new_cards_per_day: number | null
  is_public?: boolean
}

export function DeckActionsMenu({ deck }: { deck: Deck }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`「${deck.name}」を削除しますか？この操作は取り消せません。`)) return
    const result = await deleteDeck(deck.id)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('デッキを削除しました')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DeckFormDialog
          deck={deck}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>編集</DropdownMenuItem>
          }
        />
        <DropdownMenuItem onSelect={handleDelete} className="text-destructive">
          削除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
