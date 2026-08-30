// Supabase(PostgREST)への .in() フィルターはGETのクエリ文字列に展開されるため、
// 対象IDが数百〜数千件になるとURLが長大になり、プロキシ/CDN側のURL長制限に
// 引っかかってリクエストごと失敗することがある(500エラーの原因になりやすい)。
// そのため .in() に渡す配列は、このヘルパーで一定件数ごとに分割してから
// 複数回に分けてクエリを投げること。

export const SUPABASE_IN_CHUNK_SIZE = 200

export function chunkArray<T>(items: T[], size: number = SUPABASE_IN_CHUNK_SIZE): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}
