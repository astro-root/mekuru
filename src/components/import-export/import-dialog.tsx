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
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'
import { parseCsv, parseExcel, type ParsedRow } from '@/lib/import-export/parse'
import { createCardsBulk } from '@/lib/actions/cards'
import { toast } from 'sonner'

export function ImportDialog({ deckId }: { deckId: string }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [skipped, setSkipped] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
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

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setRows([])
          setFileName(null)
          setIsDragging(false)
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
          <DialogTitle className="font-heading">CSV/Excelからインポート</DialogTitle>
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

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed py-8 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-secondary/50'
                : 'border-border hover:border-foreground/25 hover:bg-muted/40'
            }`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
              <FileSpreadsheet className="h-4.5 w-4.5 text-secondary-foreground" strokeWidth={1.75} />
            </div>
            {fileName ? (
              <p className="font-mono text-sm">{fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium">クリックまたはドラッグ&ドロップ</p>
                <p className="text-xs text-muted-foreground">.csv / .xlsx / .xls に対応</p>
              </>
            )}
          </div>

          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-mono tabular-nums">{rows.length}</span>
                <span>枚を読み込みました</span>
              </div>
              {skipped > 0 && (
                <div className="flex items-center gap-2 text-sm text-[var(--destructive)]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    front/backが空の<span className="font-mono tabular-nums">{skipped}</span>行はスキップされました
                  </span>
                </div>
              )}
              <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="p-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">表</th>
                      <th className="p-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">裏</th>
                      <th className="p-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">コメント</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2">{row.front}</td>
                        <td className="p-2">{row.back}</td>
                        <td className="p-2 text-muted-foreground">{row.note}</td>
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
            {isPending ? '登録中...' : `${rows.length}枚を登録する`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
