import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// このクライアントは service_role キーを使うため、絶対にブラウザへ渡さないこと。
// サーバーアクション/Route Handlerなど、サーバー側のコードからのみ呼び出す。
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_ROOT_ACCOUNT_URL
  const serviceRoleKey = process.env.ROOT_ACCOUNT_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'ROOT_ACCOUNT_SERVICE_ROLE_KEY が設定されていません。Vercelの環境変数(サーバー専用)に追加してください。'
    )
  }

  return createSupabaseClient(url, serviceRoleKey, {
    db: { schema: 'mekuru' },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
