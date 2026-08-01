import { NextResponse } from 'next/server'

const SPREADSHEET_ID_PATTERN = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024 // 5MB

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(SPREADSHEET_ID_PATTERN)
  return match ? match[1] : null
}

function extractGid(url: string): string | null {
  const match = url.match(/[?#&]gid=(\d+)/)
  return match ? match[1] : null
}

export async function POST(request: Request) {
  let body: { url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  }

  const inputUrl = body.url?.trim()
  if (!inputUrl) {
    return NextResponse.json({ error: 'URLを入力してください' }, { status: 400 })
  }

  const spreadsheetId = extractSpreadsheetId(inputUrl)
  if (!spreadsheetId) {
    return NextResponse.json(
      { error: 'GoogleスプレッドシートのURLとして認識できませんでした' },
      { status: 400 }
    )
  }

  const gid = extractGid(inputUrl)

  // ユーザー入力のURLをそのままfetchしない。スプレッドシートIDのみを取り出し、
  // Google自身のエクスポートURLをこちらで組み立て直すことでSSRFを防ぐ。
  const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export`)
  exportUrl.searchParams.set('format', 'csv')
  if (gid) exportUrl.searchParams.set('gid', gid)

  let response: Response
  try {
    response = await fetch(exportUrl.toString(), { redirect: 'follow' })
  } catch {
    return NextResponse.json({ error: 'Googleスプレッドシートへのアクセスに失敗しました' }, { status: 502 })
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          'スプレッドシートを取得できませんでした。共有設定が「リンクを知っている全員が閲覧可」になっているか確認してください。',
      },
      { status: 502 }
    )
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('text/html')) {
    // 非公開シートの場合、Googleはログイン画面(HTML)を返してくる
    return NextResponse.json(
      {
        error:
          'このスプレッドシートは非公開のようです。共有設定を「リンクを知っている全員が閲覧可」に変更してから再度お試しください。',
      },
      { status: 403 }
    )
  }

  const buffer = await response.arrayBuffer()
  if (buffer.byteLength > MAX_RESPONSE_BYTES) {
    return NextResponse.json({ error: 'スプレッドシートのサイズが大きすぎます' }, { status: 413 })
  }

  const csvText = new TextDecoder('utf-8').decode(buffer)
  return NextResponse.json({ csv: csvText })
}
