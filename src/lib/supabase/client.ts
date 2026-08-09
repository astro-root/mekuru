import { createBrowserClient } from '@supabase/ssr'

// mekuru独自のSupabaseプロジェクトではなく、るーとの研究室 Root Accountの
// Supabaseプロジェクトを参照する。mekuruのテーブルは "mekuru" スキーマに分離してあるため、
// db.schema を明示的に指定する(指定しないとpublicスキーマを見に行ってしまう)。
// cookieのdomainを ".astro-root.com" にすることで、Root Account(accounts.astro-root.com)や
// QuizNaviなど他サービスとログインセッションを共有できる(サブドメイン間SSO)。
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_ROOT_ACCOUNT_URL!,
    process.env.NEXT_PUBLIC_ROOT_ACCOUNT_ANON_KEY!,
    {
      db: { schema: 'mekuru' },
      cookieOptions: {
        domain: process.env.NEXT_PUBLIC_ROOT_ACCOUNT_COOKIE_DOMAIN,
        path: '/',
        sameSite: 'lax',
        secure: true,
      },
    }
  )
}
