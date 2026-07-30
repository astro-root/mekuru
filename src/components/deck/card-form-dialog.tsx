'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { createCard, updateCard } from '@/lib/actions/cards'
import { toast } from 'sonner'

type CardItem = {
  id: string
  front: string
  back: string
  card_type: string
  cloze_text: string | null
  note: string | null
}

export function CardFormDialog({
  deckId,
  card,
  trigger,
}: {
  deckId: string
  card?: CardItem
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [cardType, setCardType] = useState(card?.card_type ?? 'basic')
  const router = useRouter()
  const isEdit = !!card

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    formData.set('card_type', cardType)
    const result = isEdit
      ? await updateCard(deckId, card.id, formData)
      : await createCard(deckId, formData)
    setIsPending(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(isEdit ? 'カードを更新しました' : 'カードを作成しました')
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'カードを編集' : '新しいカード'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="card_type">出題形式</Label>
            <Select value={cardType} onValueChange={setCardType}>
              <SelectTrigger id="card_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">表→裏(基本)</SelectItem>
                <SelectItem value="cloze">穴埋め(Cloze)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="front">表面</Label>
            <Input id="front" name="front" defaultValue={card?.front} required />
          </div>
          <div>
            <Label htmlFor="back">裏面</Label>
            <Input id="back" name="back" defaultValue={card?.back} required />
          </div>
          <div>
            <Label htmlFor="note">コメント(裏面と同時に表示・任意)</Label>
            <Input id="note" name="note" defaultValue={card?.note ?? ''} />
          </div>
          {cardType === 'cloze' && (
            <div>
              <Label htmlFor="cloze_text">穴埋め文({'{{c1::語句}}'} の形式)</Label>
              <Input id="cloze_text" name="cloze_text" defaultValue={card?.cloze_text ?? ''} />
            </div>
          )}
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
