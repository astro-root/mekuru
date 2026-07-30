'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, FileSpreadsheet } from 'lucide-react'
import { exportToCsv, exportToExcel } from '@/lib/import-export/parse'

type CardItem = { front: string; back: string; note: string | null }

export function ExportMenu({ deckName, cards }: { deckName: string; cards: CardItem[] }) {
  const rows = cards.map((c) => ({ front: c.front, back: c.back, note: c.note ?? undefined }))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Download className="mr-1 h-4 w-4" />
          エクスポート
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => exportToCsv(deckName, rows)} className="gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          CSVで出力
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportToExcel(deckName, rows)} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          Excel(.xlsx)で出力
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
