import { createClient } from '@/lib/supabase/server'
import { decodeEntitlements } from '@/lib/root-account/entitlements'
import { ExternalLink } from 'lucide-react'

const PLAN_LABEL: Record<string, string> = {
  bachelor: '学士',
  master: '修士',
  doctor: '博士',
}

const ACCOUNTS_URL = process.env.NEXT_PUBLIC_ACCOUNTS_URL ?? 'https://accounts.astro-root.com'

export async function AccountSection() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const entitlements = session ? decodeEntitlements(session.access_token) : null
  const plan = entitlements?.plan ?? 'bachelor'
  const email = session?.user.email

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-sm font-bold">るーとの研究室アカウント</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {email ?? '未ログイン'} としてログイン中
          </p>
        </div>
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">
          {PLAN_LABEL[plan] ?? plan}プラン
        </span>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        プロフィール・研究ポイント・プランの変更は、るーとの研究室の共通アカウント画面から
        行えます（Q-Mark・QuizNaviなど他サービスとも共通です）。
      </p>

      <a
        href={`${ACCOUNTS_URL}/profile`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        アカウント設定を開く
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}
