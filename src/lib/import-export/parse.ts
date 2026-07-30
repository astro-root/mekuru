import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export type ParsedRow = {
  front: string
  back: string
  note?: string
}

export type ParseResult = {
  rows: ParsedRow[]
  skipped: number
}

const HEADER_ALIASES: Record<string, keyof ParsedRow> = {
  front: 'front',
  表: 'front',
  表面: 'front',
  問題: 'front',
  back: 'back',
  裏: 'back',
  裏面: 'back',
  答え: 'back',
  回答: 'back',
  note: 'note',
  コメント: 'note',
  備考: 'note',
  メモ: 'note',
}

function normalizeHeader(header: string): keyof ParsedRow | null {
  const trimmed = header.trim()
  return HEADER_ALIASES[trimmed] ?? null
}

function rowsFromRecords(records: Record<string, unknown>[]): ParseResult {
  const rows: ParsedRow[] = []
  let skipped = 0

  for (const record of records) {
    const mapped: Partial<ParsedRow> = {}
    for (const [key, value] of Object.entries(record)) {
      const field = normalizeHeader(key)
      if (!field) continue
      const strValue = value == null ? '' : String(value).trim()
      if (strValue) mapped[field] = strValue
    }

    if (mapped.front && mapped.back) {
      rows.push({ front: mapped.front, back: mapped.back, note: mapped.note })
    } else {
      skipped++
    }
  }

  return { rows, skipped }
}

export function parseCsv(fileText: string): ParseResult {
  const result = Papa.parse<Record<string, unknown>>(fileText, {
    header: true,
    skipEmptyLines: true,
  })
  return rowsFromRecords(result.data)
}

export function parseExcel(arrayBuffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return rowsFromRecords(records)
}

export function exportToCsv(deckName: string, cards: ParsedRow[]) {
  const csv = Papa.unparse(
    cards.map((c) => ({ front: c.front, back: c.back, note: c.note ?? '' }))
  )
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${deckName}.csv`)
}

export function exportToExcel(deckName: string, cards: ParsedRow[]) {
  const worksheet = XLSX.utils.json_to_sheet(
    cards.map((c) => ({ front: c.front, back: c.back, note: c.note ?? '' }))
  )
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'cards')
  const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' })
  downloadBlob(blob, `${deckName}.xlsx`)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
