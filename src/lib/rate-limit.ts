import { createAdminClient } from '@/lib/supabase/admin'

/**
 * ログイン・サインアップ・パスワードリセットの総当たり対策用レート制限。
 * Vercelサーバーレスではインスタンスが使い捨てのため、インメモリのカウンタは
 * リクエストごとにリセットされてしまい機能しない。Supabase(service_role)に
 * イベントを記録し、直近ウィンドウ内の件数で判定する。
 */

type RateLimitCheck = {
  allowed: boolean
  retryAfterSeconds?: number
}

const WINDOW_SECONDS = 15 * 60 // 15分
const MAX_ATTEMPTS = 10 // 15分あたりの上限

export async function checkRateLimit(
  action: 'login' | 'signup' | 'password_reset',
  identifier: string
): Promise<RateLimitCheck> {
  const bucketKey = `${action}:${identifier.trim().toLowerCase()}`
  const admin = createAdminClient()
  const windowStart = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString()

  const { count, error } = await admin
    .from('auth_rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('bucket_key', bucketKey)
    .gte('created_at', windowStart)

  if (error) {
    // レート制限側の障害でログイン自体を止めないよう、記録に失敗しても許可する。
    console.error('rate limit check failed', error)
    return { allowed: true }
  }

  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: WINDOW_SECONDS }
  }

  await admin.from('auth_rate_limit_events').insert({ bucket_key: bucketKey })
  return { allowed: true }
}

export function getClientIdentifier(headersList: Headers, email?: string): string {
  const forwardedFor = headersList.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown'
  // IPとメールアドレスの両方を鍵に含めることで、同一IPからの複数アカウント試行と
  // 分散IPからの単一アカウント総当たりの両方に対応する。
  return email ? `${ip}:${email.trim().toLowerCase()}` : ip
}
