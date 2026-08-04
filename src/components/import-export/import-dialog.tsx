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
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Link as LinkIcon, DatabaseBackup } from 'lucide-react'
import {
  parseCsv,
  parseExcel,
  MAX_IMPORT_FILE_SIZE_BYTES,
  MAX_IMPORT_ROWS,
  type ParsedRow,
  type ParseResult,
} from '@/lib/import-export/parse'
import { createCardsBulk } from '@/lib/actions/cards'
import { restoreDeckBackup } from '@/lib/actions/backup'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'

type BackupPreview = {
  raw: unknown
  cardCount: number
  reviewCount: number
}

export function ImportDialog({ deckId }: { deckId: string }) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'file' | 'gsheet' | 'backup'>('file')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [skipped, setSkipped] = useState(0)
  const [hadHeader, setHadHeader] = useState(true)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [gsheetUrl, setGsheetUrl] = useState('')
  const [isFetchingGsheet, setIsFetchingGsheet] = useState(false)
  const [backupFileName, setBackupFileName] = useState<string | null>(null)
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const backupInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleFile(file: File) {
    const lowerName = file.name.toLowerCase()

    // マクロ付き(.xlsm)や想定外の拡張子は、ファイル選択ダイアログのaccept属性では
    // ドラッグ&ドロップ時に弾けないため、ここで明示的に検証する
    const allowedExtensions = ['.csv', '.xlsx', '.xls']
    if (!allowedExtensions.some((ext) => lowerName.endsWith(ext))) {
      toast.error('.csv / .xlsx / .xls 形式のファイルのみ読み込めます(.xlsmなどマクロ付きファイルは非対応です)')
      return
    }

    if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
      toast.error(`ファイルサイズが大きすぎます(上限 ${MAX_IMPORT_FILE_SIZE_BYTES / 1024 / 1024}MB)`)
      return
    }

    setFileName(file.name)
    try {
      let result: ParseResult
      if (lowerName.endsWith('.csv')) {
        const text = await file.text()
        result = parseCsv(text)
      } else {
        const buffer = await file.arrayBuffer()
        result = parseExcel(buffer)
      }
      setRows(result.rows)
      setSkipped(result.skipped)
      setHadHeader(result.hadHeader)

      if (result.rows.length === 0) {
        toast.error('front・backの両方が入った行が見つかりませんでした。内容をご確認ください。')
      } else if (result.rows.length >= MAX_IMPORT_ROWS) {
        toast.warning(`1回のインポートは最大${MAX_IMPORT_ROWS}行までです。超えた分は読み込まれていません。`)
      }
    } catch {
      toast.error('ファイルの読み込みに失敗しました。ファイル形式(.csv / .xlsx / .xls)をご確認ください。')
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

  async function handleBackupFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.json')) {
      toast.error('.json形式のバックアップファイルを選択してください')
      return
    }
    if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
      toast.error(`ファイルサイズが大きすぎます(上限 ${MAX_IMPORT_FILE_SIZE_BYTES / 1024 / 1024}MB)`)
      return
    }

    setBackupFileName(file.name)
    setBackupPreview(null)
    try {
      const text = await file.text()
      const raw = JSON.parse(text)
      const cards = Array.isArray(raw?.cards) ? raw.cards : null
      if (!cards) {
        toast.error('バックアップファイルの形式が正しくありません(cardsが見つかりません)')
        return
      }
      const reviewCount = cards.filter(
        (c: { review?: unknown }) => c && typeof c === 'object' && c.review
      ).length
      setBackupPreview({ raw, cardCount: cards.length, reviewCount })
    } catch {
      toast.error('JSONファイルの読み込みに失敗しました。ファイルが壊れていないかご確認ください。')
    }
  }

  async function handleConfirmBackupRestore() {
    if (!backupPreview) return
    setIsPending(true)
    const result = await restoreDeckBackup(deckId, backupPreview.raw)
    setIsPending(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(
      `${result?.count ?? 0}枚のカードを復元しました(学習状態: ${result?.restoredReviews ?? 0}枚分)`
    )
    setOpen(false)
    setBackupPreview(null)
    setBackupFileName(null)
    router.refresh()
  }

  function handleBackupDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleBackupDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleBackupFile(file)
  }

  async function handleGsheetImport() {
    const url = gsheetUrl.trim()
    if (!url) return

    setIsFetchingGsheet(true)
    try {
      const res = await fetch('/api/import/gsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'スプレッドシートの読み込みに失敗しました')
        return
      }

      setFileName('Googleスプレッドシート')
      const result = parseCsv(data.csv as string)
      setRows(result.rows)
      setSkipped(result.skipped)
      setHadHeader(result.hadHeader)

      if (result.rows.length === 0) {
        toast.error('front・backの両方が入った行が見つかりませんでした。内容をご確認ください。')
      } else if (result.rows.length >= MAX_IMPORT_ROWS) {
        toast.warning(`1回のインポートは最大${MAX_IMPORT_ROWS}行までです。超えた分は読み込まれていません。`)
      }
    } catch {
      toast.error('スプレッドシートの読み込みに失敗しました')
    } finally {
      setIsFetchingGsheet(false)
    }
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
          setHadHeader(true)
          setActiveTab('file')
          setBackupFileName(null)
          setBackupPreview(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="mr-1 h-4 w-4" />
          インポート
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">インポート</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList>
              <TabsTrigger value="file">ファイルから</TabsTrigger>
              <TabsTrigger value="gsheet">Googleスプレッドシートのリンクから</TabsTrigger>
              <TabsTrigger value="backup">バックアップ(JSON)から復元</TabsTrigger>
            </TabsList>
            <TabsContent value="gsheet" className="space-y-2 pt-3">
              <p className="text-xs text-muted-foreground">
                共有設定を「リンクを知っている全員が閲覧可」にしたうえで、URLを貼り付けてください。
              </p>
              <div className="flex gap-2">
                <Input
                  value={gsheetUrl}
                  onChange={(e) => setGsheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!gsheetUrl.trim() || isFetchingGsheet}
                  onClick={handleGsheetImport}
                >
                  <LinkIcon className="mr-1 h-4 w-4" />
                  {isFetchingGsheet ? '読み込み中...' : '読み込む'}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="file" className="space-y-3 pt-3">
          <p className="text-xs text-muted-foreground">
            1行目が front/back(または 表/裏、問題/答え)などの見出しならそれを使い、見出しが無ければ
            1列目=表・2列目=裏・3列目=コメントとしてそのまま読み込みます。
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed py-8 text-center transition-all duration-200 ${
              isDragging
                ? 'scale-[1.01] border-primary bg-secondary/50'
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
            </TabsContent>
            <TabsContent value="backup" className="space-y-3 pt-3">
              <p className="text-xs text-muted-foreground">
                このサービスから出力した「完全バックアップ(JSON)」ファイルを読み込みます。カード内容に加えて、
                学習状態(FSRSの復習間隔・熟練度など)も一緒に復元されます。既存のカードには追記される形で登録されます。
              </p>

              <input
                ref={backupInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleBackupFile(file)
                  e.target.value = ''
                }}
              />

              <div
                onDragOver={handleBackupDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleBackupDrop}
                onClick={() => backupInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed py-8 text-center transition-all duration-200 ${
                  isDragging
                    ? 'scale-[1.01] border-primary bg-secondary/50'
                    : 'border-border hover:border-foreground/25 hover:bg-muted/40'
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  <DatabaseBackup className="h-4.5 w-4.5 text-secondary-foreground" strokeWidth={1.75} />
                </div>
                {backupFileName ? (
                  <p className="font-mono text-sm">{backupFileName}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">クリックまたはドラッグ&ドロップ</p>
                    <p className="text-xs text-muted-foreground">.json に対応</p>
                  </>
                )}
              </div>

              {backupPreview && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="font-mono tabular-nums">{backupPreview.cardCount}</span>
                  <span>枚を読み込みました</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    うち学習状態あり: {backupPreview.reviewCount}枚
                  </span>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {rows.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-300 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-mono tabular-nums">{rows.length}</span>
                <span>枚を読み込みました</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {hadHeader ? '見出し行を検出' : '見出し行なし(1列目から適用)'}
                </span>
              </div>
              {skipped > 0 && (
                <div className="flex items-center gap-2 text-sm text-[var(--destructive)]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    front/backが空の<span className="font-mono tabular-nums">{skipped}</span>行はスキップされました
                  </span>
                </div>
              )}
              <div className="max-h-64 overflow-y-auto overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[480px] text-sm">
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
          {activeTab === 'backup' ? (
            <Button
              type="button"
              disabled={!backupPreview || backupPreview.cardCount === 0 || isPending}
              onClick={handleConfirmBackupRestore}
            >
              {isPending ? '復元中...' : `${backupPreview?.cardCount ?? 0}枚を復元する`}
            </Button>
          ) : (
            <Button type="button" disabled={rows.length === 0 || isPending} onClick={handleConfirm}>
              {isPending ? '登録中...' : `${rows.length}枚を登録する`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
