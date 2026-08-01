'use client'

import { useState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setMessage(null)
    const result = await requestPasswordReset(formData)
    if (result?.error) {
      setIsError(true)
      setMessage(result.error)
      setIsPending(false)
      return
    }
    setIsError(false)
    setSent(true)
    setIsPending(false)
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
          <h1 className="font-heading text-2xl font-bold tracking-wide">パスワード再設定</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            登録したメールアドレスに再設定用のリンクを送信します。
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {sent ? (
            <div className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                入力したメールアドレス宛にパスワード再設定用のリンクを送信しました。
                届いていない場合は、迷惑メールフォルダもご確認ください。
              </span>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">メールアドレス</Label>
                <Input id="email" name="email" type="email" required autoFocus />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? '送信中...' : '再設定リンクを送信'}
              </Button>
            </form>
          )}

          {message && (
            <div
              className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                isError
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {isError ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{message}</span>
            </div>
          )}

          <div className="mt-5 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              ログイン画面に戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
