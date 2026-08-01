'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleSignIn(formData: FormData) {
    setIsPending(true)
    setMessage(null)
    const result = await signInWithEmail(formData)
    if (result?.error) {
      setIsError(true)
      setMessage(result.error)
      setIsPending(false)
      return
    }
    router.push('/decks')
    router.refresh()
  }

  async function handleSignUp(formData: FormData) {
    setIsPending(true)
    setMessage(null)
    const result = await signUpWithEmail(formData)
    if (result?.error) {
      setIsError(true)
      setMessage(result.error)
    }
    if (result?.success) {
      setIsError(false)
      setMessage('確認メールを送信しました。受信箱を確認してください。')
    }
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
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="mb-2">
            <rect x="3" y="4" width="14" height="18" rx="2" className="fill-secondary" />
            <path d="M17 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2" className="stroke-primary" strokeWidth="1.6" />
            <path d="M17 4 L23 8 L17 10 Z" className="fill-accent stroke-accent-foreground" strokeWidth="0.6" />
          </svg>
          <h1 className="font-heading text-2xl font-bold tracking-wide">めくる</h1>
          <p className="mt-1 text-sm text-muted-foreground">めくって、覚える。</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => signInWithGoogle()}
          >
            <svg width="16" height="16" viewBox="0 0 48 48" className="mr-1">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3c-7.6 0-14.1 4.3-17.4 10.6z"/>
              <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 36 26.8 37 24 37c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.8 40.6 16.4 45 24 45z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C40.9 36 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z"/>
            </svg>
            Googleでログイン
          </Button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">または</span>
            </div>
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">ログイン</TabsTrigger>
              <TabsTrigger value="signup">新規登録</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form action={handleSignIn} className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">パスワード</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? 'ログイン中...' : 'ログイン'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form action={handleSignUp} className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email-signup">メールアドレス</Label>
                  <Input id="email-signup" name="email" type="email" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-signup">パスワード(8文字以上)</Label>
                  <Input id="password-signup" name="password" type="password" minLength={8} required />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? '作成中...' : 'アカウント作成'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

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

          <p className="mt-4 text-center text-xs text-muted-foreground">
            登録することで
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
              利用規約
            </a>
            および
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
              プライバシーポリシー
            </a>
            に同意したものとみなされます。
          </p>
        </div>
      </div>
    </div>
  )
}
