'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updateContactMessageStatus, type ContactMessage } from '@/lib/actions/admin'
import { toast } from 'sonner'

const STATUS_LABEL: Record<ContactMessage['status'], string> = {
  new: '未対応',
  read: '確認済み',
  replied: '返信済み',
}

const STATUS_VARIANT: Record<ContactMessage['status'], 'default' | 'secondary' | 'outline'> = {
  new: 'default',
  read: 'secondary',
  replied: 'outline',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
}

export function ContactMessageList({ messages }: { messages: ContactMessage[] }) {
  const [items, setItems] = useState(messages)
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(id: string, status: ContactMessage['status']) {
    startTransition(async () => {
      const result = await updateContactMessageStatus(id, status)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      setItems((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)))
    })
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">お問い合わせはまだありません。</p>
  }

  return (
    <div className="space-y-3">
      {items.map((m) => (
        <div key={m.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-bold">{m.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{m.email}</span>
            </div>
            <Badge variant={STATUS_VARIANT[m.status]}>{STATUS_LABEL[m.status]}</Badge>
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{formatDate(m.created_at)}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{m.message}</p>
          <div className="mt-3 flex gap-2">
            {(['new', 'read', 'replied'] as const).map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={m.status === s ? 'default' : 'outline'}
                disabled={isPending || m.status === s}
                onClick={() => handleStatusChange(m.id, s)}
              >
                {STATUS_LABEL[s]}にする
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
