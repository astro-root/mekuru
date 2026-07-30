'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Upload } from 'lucide-react'
import { parseCsv, parseExcel, type ParsedRow } from '@/lib/import-export/parse'
import { createCardsBulk } from '@/lib/actions/cards'
import { toast } from 'sonner'

export function ImportDialog({ deckId }: { deckId: string }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [skipped, setSkipped] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleFile(file: File) {
    setFileName(file.name)
    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text()
        const result = parseCsv(text)
        setRows(result.rows)
        setSkipped(result.skipped)
      } else {
        const buffer = await file.arrayBuffer()
        const result = parseExcel(buffer)
        setRows(result.rows)
        setSkipped(result.skipped)
      }
    } catch {
      toast.error('ファイルの読み込みに失敗しました。列名(front/back または 表/裏)を確認してください。')
    }
  }

  async function handleConfirm() {
    setIsPending(true)
    const result = await createCardsBulk(deckId, rows)
    setIsPending(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(`${result?.count ?? rows.length}枚のカードを登録しました`)
    setOpen(false)
    setRows([])
    setFileName(null)
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setRows([])
          setFileName(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="mr-1 h-4 w-4" />
          インポート
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>CSV/Excelからインポート</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            列名は front/back(または 表/裏、問題/答え)、コメント列は note(またはコメント)を認識します。
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            ファイルを選択
          </Button>
          {fileName && <span className="ml-2 text-sm text-muted-foreground">{fileName}</span>}

          {rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm">
                {rows.length}枚を読み込みました
                {skipped > 0 && `(front/backが空の${skipped}行はスキップされました)`}
              </p>
              <div className="max-h-64 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">表</th>
                      <th className="text-left p-2">裏</th>
                      <th className="text-left p-2">コメント</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{row.front}</td>
                        <td className="p-2">{row.back}</td>
                        <td className="p-2">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 50 && (
                <p className="text-xs text-muted-foreground">先頭50行のみプレビュー表示しています</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" disabled={rows.length === 0 || isPending} onClick={handleConfirm}>
            {rows.length}枚を登録する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
