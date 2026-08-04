'use client'

import { useState, useTransition } from 'react'
import { deleteAccount } from '@/lib/actions/auth'
import { clearOfflineData } from '@/lib/offline/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const CONFIRM_WORD = '削除する'

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canDelete = confirmText === CONFIRM_WORD

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteAccount()
      if (result?.error) {
        setError(result.error)
        return
      }
      await clearOfflineData()
    })
  }

  return (
    <div className="mt-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="destructive" size="sm">
            アカウントを削除する
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>本当にアカウントを削除しますか？</DialogTitle>
            <DialogDescription>
              全てのデッキ・カード・学習履歴が完全に削除され、復元できません。
              続行するには「{CONFIRM_WORD}」と入力してください。
            </DialogDescription>
          </DialogHeader>

          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            autoComplete="off"
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={!canDelete || isPending}
              onClick={handleDelete}
            >
              {isPending ? '削除中…' : '完全に削除する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
