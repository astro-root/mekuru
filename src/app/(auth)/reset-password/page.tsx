'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updatePassword } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    const password = formData.get('password') as string
    const passwordConfirm = formData.get('password-confirm') as string

    if (password !== passwordConfirm) {
      setError('パスワードが一致しません。')
      return
    }

    setIsPending(true)
    setError(null)
    const result = await updatePassword(formData)
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
      return
    }
    router.push('/decks?password_updated=1')
    router.refresh()
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background:
          'radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--primary) 6%, var(--background)), var(--background) 60%)',
      }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <h1 className="font-heading text-2xl font-bold tracking-wide">新しいパスワードを設定</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            アカウントで使用する新しいパスワードを入力してください。
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <form action={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="password">新しいパスワード(8文字以上)</Label>
              <Input id="password" name="password" type="password" minLength={8} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password-confirm">新しいパスワード(確認)</Label>
              <Input id="password-confirm" name="password-confirm" type="password" minLength={8} required />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? '更新中...' : 'パスワードを更新'}
            </Button>
          </form>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
