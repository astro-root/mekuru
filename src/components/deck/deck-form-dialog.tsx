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
import { createDeck, updateDeck } from '@/lib/actions/decks'
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

export function DeckFormDialog({
  deck,
  trigger,
}: {
  deck?: Deck
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [difficulty, setDifficulty] = useState(deck?.difficulty ?? 1)
  const [newCardsPerDay, setNewCardsPerDay] = useState(
    deck?.new_cards_per_day != null ? String(deck.new_cards_per_day) : ''
  )
  const [isPublic, setIsPublic] = useState(deck?.is_public ?? false)
  const router = useRouter()
  const isEdit = !!deck

  async function handleSubmit(formData: FormData) {
    formData.set('difficulty', String(difficulty))
    formData.set('newCardsPerDay', newCardsPerDay.trim())
    formData.set('isPublic', String(isPublic))
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setDifficulty(deck?.difficulty ?? 1)
          setNewCardsPerDay(deck?.new_cards_per_day != null ? String(deck.new_cards_per_day) : '')
          setIsPublic(deck?.is_public ?? false)
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEdit ? 'デッキを編集' : '新しいデッキ'}
          </DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">デッキ名</Label>
            <Input id="name" name="name" defaultValue={deck?.name} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={deck?.description ?? ''}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="genre">ジャンル</Label>
            <Input
              id="genre"
              name="genre"
              defaultValue={deck?.genre ?? ''}
              placeholder="例: 歴史, 英単語"
            />
          </div>
          <div className="space-y-1.5">
            <Label>難易度</Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => {
                  const level = i + 1
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      aria-label={`難易度 ${level}`}
                      className="p-0.5"
                    >
                      <span
                        className={`block h-3 w-3 rounded-full transition-colors ${
                          level <= difficulty ? 'bg-primary' : 'bg-border'
                        }`}
                      />
                    </button>
                  )
                })}
              </div>
              <span className="font-mono text-sm text-muted-foreground">{difficulty} / 5</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newCardsPerDay">1日の新規カード数上限</Label>
            <Input
              id="newCardsPerDay"
              name="newCardsPerDay"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="空欄で上限なし"
              value={newCardsPerDay}
              onChange={(e) => setNewCardsPerDay(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              1日に新しく出題する未学習カードの上限数です。空欄の場合は上限を設けません。
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">このデッキを公開する</span>
                <span className="block text-xs text-muted-foreground">
                  公開すると、他のユーザーが「みんなのデッキ」から見つけて複製できるようになります。
                </span>
              </span>
            </label>
          </div>
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
