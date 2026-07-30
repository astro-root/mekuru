'use client'

import { useRouter } from 'next/navigation'
import { MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CardFormDialog } from './card-form-dialog'
import { deleteCard } from '@/lib/actions/cards'
import { toast } from 'sonner'

type CardItem = {
  id: string
  front: string
  back: string
  card_type: string
  cloze_text: string | null
  note: string | null
}

export function CardRow({ deckId, card }: { deckId: string; card: CardItem }) {
  const router = useRouter()
  const isCloze = card.card_type === 'cloze'

  async function handleDelete() {
    if (!confirm('このカードを削除しますか？')) return
    const result = await deleteCard(deckId, card.id)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('カードを削除しました')
    router.refresh()
  }

  return (
    <div className="group relative flex items-center justify-between overflow-hidden rounded-lg border border-border bg-card pl-4 pr-2 py-3 transition-colors hover:border-foreground/20">
      <span
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: isCloze ? 'var(--chart-2)' : 'var(--chart-1)' }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant={isCloze ? 'secondary' : 'outline'} className="shrink-0">
            {isCloze ? '穴埋め' : '表裏'}
          </Badge>
          <p className="truncate text-sm font-medium">{card.front}</p>
        </div>
        <p className="truncate text-sm text-muted-foreground mt-1">{card.back}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <CardFormDialog
            deckId={deckId}
            card={card}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>編集</DropdownMenuItem>
            }
          />
          <DropdownMenuItem onSelect={handleDelete} className="text-destructive">
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
