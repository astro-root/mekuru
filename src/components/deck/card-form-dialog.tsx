'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  tags?: { id: string; name: string }[]
}

const CARD_TYPES = [
  { value: 'basic', label: '表→裏', colorVar: 'var(--chart-1)' },
  { value: 'cloze', label: '穴埋め', colorVar: 'var(--chart-2)' },
] as const

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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setCardType(card?.card_type ?? 'basic')
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEdit ? 'カードを編集' : '新しいカード'}
          </DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>出題形式</Label>
            <div className="grid grid-cols-2 gap-2">
              {CARD_TYPES.map((t) => {
                const active = cardType === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setCardType(t.value)}
                    className={`relative flex items-center gap-2 overflow-hidden rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'border-transparent bg-secondary text-secondary-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: t.colorVar }}
                    />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="front">表面</Label>
            <Textarea id="front" name="front" defaultValue={card?.front} rows={2} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="back">裏面</Label>
            <Textarea id="back" name="back" defaultValue={card?.back} rows={2} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">コメント(裏面と同時に表示・任意)</Label>
            <Textarea id="note" name="note" defaultValue={card?.note ?? ''} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">タグ(カンマ区切り・任意)</Label>
            <Input
              id="tags"
              name="tags"
              defaultValue={(card?.tags ?? []).map((t) => t.name).join(', ')}
              placeholder="例: 歴史, 江戸時代"
            />
          </div>
          {!isEdit && cardType === 'basic' && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="also_create_reversed" className="h-4 w-4 rounded border-border" />
              裏→表(逆方向)のカードも同時に作る
            </label>
          )}
          {cardType === 'cloze' && (
            <div className="space-y-1.5">
              <Label htmlFor="cloze_text">穴埋め文</Label>
              <Input
                id="cloze_text"
                name="cloze_text"
                defaultValue={card?.cloze_text ?? ''}
                className="font-mono text-sm"
                placeholder="例: 徳川幕府 第{{c1::15}}代将軍"
              />
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{'{{c1::語句}}'}</span> の形式で穴埋め箇所を囲んでください
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中...' : isEdit ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
