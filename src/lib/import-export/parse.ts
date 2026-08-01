import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export type ParsedRow = {
  front: string
  back: string
  note?: string
}

export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
export const MAX_IMPORT_ROWS = 3000

export type ParseResult = {
  rows: ParsedRow[]
  skipped: number
  /** ヘッダー行が見出しとして認識され、消費されたかどうか(参考情報) */
  hadHeader: boolean
}

const HEADER_ALIASES: Record<string, keyof ParsedRow> = {
  front: 'front',
  表: 'front',
  表面: 'front',
  問題: 'front',
  質問: 'front',
  back: 'back',
  裏: 'back',
  裏面: 'back',
  答え: 'back',
  回答: 'back',
  解答: 'back',
  note: 'note',
  comment: 'note',
  コメント: 'note',
  備考: 'note',
  メモ: 'note',
}

// 位置指定(見出し行が無いファイル用): 1列目=表, 2列目=裏, 3列目=コメント
const POSITIONAL_FIELDS: (keyof ParsedRow)[] = ['front', 'back', 'note']

function normalizeHeaderCell(cell: unknown): string {
  const raw = cell == null ? '' : String(cell)
  // 先頭のBOM文字・前後の空白を除去し、英字は小文字化してから照合する
  return raw.replace(/^\uFEFF/, '').trim().toLowerCase()
}

function normalizeHeader(header: string): keyof ParsedRow | null {
  return HEADER_ALIASES[normalizeHeaderCell(header)] ?? null
}

function cellToString(value: unknown): string {
  return value == null ? '' : String(value).trim()
}

function isRowEmpty(row: unknown[]): boolean {
  return row.every((cell) => cellToString(cell) === '')
}

/** 1行目が見出し行かどうかを判定する: front/backに相当する列名が1つでも見つかれば見出し行とみなす */
function detectsHeaderRow(row: unknown[]): boolean {
  return row.some((cell) => {
    const field = normalizeHeader(cellToString(cell))
    return field === 'front' || field === 'back'
  })
}

function buildRow(mapped: Partial<ParsedRow>): ParsedRow | null {
  if (mapped.front && mapped.back) {
    return { front: mapped.front, back: mapped.back, note: mapped.note }
  }
  return null
}

/**
 * 見出し行の有無を自動判定して行データに変換する。
 * - 1行目にfront/back相当の列名があれば、それを見出し行として使う
 * - 無ければ、1行目からすべてデータ行とみなし、1列目=表, 2列目=裏, 3列目=コメント として読み込む
 */
function rowsFromMatrix(matrix: unknown[][]): ParseResult {
  // 巨大ファイル対策: 見出し行を含めても上限行数を超える場合は、それ以降を切り捨てる
  const cappedMatrix =
    matrix.length > MAX_IMPORT_ROWS + 1 ? matrix.slice(0, MAX_IMPORT_ROWS + 1) : matrix
  const nonEmptyRows = cappedMatrix.filter((row) => !isRowEmpty(row))
  if (nonEmptyRows.length === 0) return { rows: [], skipped: 0, hadHeader: false }

  const firstRow = nonEmptyRows[0]
  const hadHeader = detectsHeaderRow(firstRow)

  const rows: ParsedRow[] = []
  let skipped = 0

  if (hadHeader) {
    const fieldByColumn = firstRow.map((cell) => normalizeHeader(cellToString(cell)))
    for (const dataRow of nonEmptyRows.slice(1)) {
      const mapped: Partial<ParsedRow> = {}
      fieldByColumn.forEach((field, colIndex) => {
        if (!field) return
        const strValue = cellToString(dataRow[colIndex])
        if (strValue) mapped[field] = strValue
      })
      const row = buildRow(mapped)
      if (row) rows.push(row)
      else skipped++
    }
  } else {
    for (const dataRow of nonEmptyRows) {
      const mapped: Partial<ParsedRow> = {}
      POSITIONAL_FIELDS.forEach((field, colIndex) => {
        const strValue = cellToString(dataRow[colIndex])
        if (strValue) mapped[field] = strValue
      })
      const row = buildRow(mapped)
      if (row) rows.push(row)
      else skipped++
    }
  }

  return { rows, skipped, hadHeader }
}

export function parseCsv(fileText: string): ParseResult {
  const cleanedText = fileText.replace(/^\uFEFF/, '')
  const result = Papa.parse<unknown[]>(cleanedText, {
    header: false,
    skipEmptyLines: true,
  })
  return rowsFromMatrix(result.data)
}

export function parseExcel(arrayBuffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', blankrows: false })
  return rowsFromMatrix(matrix)
}

/**
 * Excel/Google SheetsでCSVを開いた際に、セルの先頭が =,+,-,@ だと数式として
 * 解釈・実行されてしまう(CSVインジェクション)。先頭にシングルクォートを付けて
 * 常に文字列として扱われるようにする。
 */
function escapeForSpreadsheetFormula(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`
  }
  return value
}

export function exportToCsv(deckName: string, cards: ParsedRow[]) {
  const csv = Papa.unparse(
    cards.map((c) => ({
      front: escapeForSpreadsheetFormula(c.front),
      back: escapeForSpreadsheetFormula(c.back),
      note: escapeForSpreadsheetFormula(c.note ?? ''),
    }))
  )
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${deckName}.csv`)
}

export function exportToExcel(deckName: string, cards: ParsedRow[]) {
  const worksheet = XLSX.utils.json_to_sheet(
    cards.map((c) => ({
      front: escapeForSpreadsheetFormula(c.front),
      back: escapeForSpreadsheetFormula(c.back),
      note: escapeForSpreadsheetFormula(c.note ?? ''),
    }))
  )
  // 全セルを明示的に文字列型(t: 's')へ固定し、数式として解釈されるのを防ぐ
  Object.keys(worksheet).forEach((cellRef) => {
    if (cellRef.startsWith('!')) return
    const cell = worksheet[cellRef]
    if (cell && typeof cell.v === 'string') {
      cell.t = 's'
    }
  })
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
