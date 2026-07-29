'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { createDeck, updateDeck } from '@/lib/actions/decks'
import { toast } from 'sonner'

type Deck = {
  id: string
  name: string
  description: string | null
  genre: string | null
  difficulty: number
}

export function DeckFormDialog({
  deck,
  trigger,
}: {
  deck?: Deck
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()
  const isEdit = !!deck

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    const result = isEdit
      ? await updateDeck(deck.id, formData)
      : await createDeck(formData)
    setIsPending(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(isEdit ? 'デッキを更新しました' : 'デッキを作成しました')
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'デッキを編集' : '新しいデッキ'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">デッキ名</Label>
            <Input id="name" name="name" defaultValue={deck?.name} required />
          </div>
          <div>
            <Label htmlFor="description">説明</Label>
            <Input id="description" name="description" defaultValue={deck?.description ?? ''} />
          </div>
          <div>
            <Label htmlFor="genre">ジャンル</Label>
            <Input id="genre" name="genre" defaultValue={deck?.genre ?? ''} placeholder="例: 歴史, 英単語" />
          </div>
          <div>
            <Label htmlFor="difficulty">難易度(1〜5)</Label>
            <Input
              id="difficulty"
              name="difficulty"
              type="number"
              min={1}
              max={5}
              defaultValue={deck?.difficulty ?? 1}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isEdit ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
