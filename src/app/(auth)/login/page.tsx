'use client'

import { useState } from 'react'
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function LoginPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSignIn(formData: FormData) {
    setIsPending(true)
    setMessage(null)
    const result = await signInWithEmail(formData)
    if (result?.error) setMessage(result.error)
    setIsPending(false)
  }

  async function handleSignUp(formData: FormData) {
    setIsPending(true)
    setMessage(null)
    const result = await signUpWithEmail(formData)
    if (result?.error) setMessage(result.error)
    if (result?.success) setMessage('確認メールを送信しました。受信箱を確認してください。')
    setIsPending(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">めくる</h1>
          <p className="text-sm text-muted-foreground mt-1">めくって、覚える。</p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signInWithGoogle()}
        >
          Googleでログイン
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">または</span>
          </div>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">ログイン</TabsTrigger>
            <TabsTrigger value="signup">新規登録</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form action={handleSignIn} className="space-y-3 mt-4">
              <div>
                <Label htmlFor="email">メールアドレス</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="password">パスワード</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                ログイン
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form action={handleSignUp} className="space-y-3 mt-4">
              <div>
                <Label htmlFor="email-signup">メールアドレス</Label>
                <Input id="email-signup" name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="password-signup">パスワード(8文字以上)</Label>
                <Input id="password-signup" name="password" type="password" minLength={8} required />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                アカウント作成
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {message && (
          <p className="text-sm text-center text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  )
}
