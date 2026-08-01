'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, FileSpreadsheet, DatabaseBackup } from 'lucide-react'
import { exportToCsv, exportToExcel } from '@/lib/import-export/parse'
import { downloadJsonBackup } from '@/lib/import-export/backup'
import { getDeckBackup } from '@/lib/actions/backup'
import { toast } from 'sonner'

type CardItem = { front: string; back: string; note: string | null }

export function ExportMenu({
  deckId,
  deckName,
  cards,
}: {
  deckId: string
  deckName: string
  cards: CardItem[]
}) {
  const [isBackingUp, setIsBackingUp] = useState(false)
  const rows = cards.map((c) => ({ front: c.front, back: c.back, note: c.note ?? undefined }))

  async function handleBackupDownload() {
    setIsBackingUp(true)
    const result = await getDeckBackup(deckId)
    setIsBackingUp(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    downloadJsonBackup(deckName, result)
    toast.success('バックアップを出力しました')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Download className="mr-1 h-4 w-4" />
          エクスポート
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onSelect={() => exportToCsv(deckName, rows)} className="gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          CSVで出力
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportToExcel(deckName, rows)} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          Excel(.xlsx)で出力
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            handleBackupDownload()
          }}
          disabled={isBackingUp}
          className="flex-col items-start gap-0.5"
        >
          <span className="flex items-center gap-2">
            <DatabaseBackup className="h-4 w-4 text-muted-foreground" />
            {isBackingUp ? '出力中...' : '完全バックアップ(JSON)'}
          </span>
          <span className="pl-6 text-xs text-muted-foreground">
            学習進捗(FSRS状態)も含めて出力します
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
