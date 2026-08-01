'use client'

import { useState } from 'react'
import { getFullBackup } from '@/lib/actions/export'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

export function BackupSection() {
  const [isPending, setIsPending] = useState(false)

  async function handleBackup() {
    setIsPending(true)
    try {
      const result = await getFullBackup()
      if (result.error || !result.data) {
        toast.error(result.error ?? 'バックアップの取得に失敗しました')
        return
      }

      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `mekuru-backup-${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('バックアップをダウンロードしました')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-sm font-bold">データのバックアップ</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        デッキ・カード・タグ・学習履歴・復習の進捗状況(FSRS)を含む、全データをJSON形式でダウンロードします。
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-3" disabled={isPending} onClick={handleBackup}>
        <Download className="mr-1 h-4 w-4" />
        {isPending ? '準備中...' : '全データをバックアップ'}
      </Button>
    </div>
  )
}
