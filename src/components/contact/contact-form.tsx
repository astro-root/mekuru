'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { submitContactMessage } from '@/lib/actions/contact'
import { toast } from 'sonner'

export function ContactForm() {
  const [isPending, setIsPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    const result = await submitContactMessage(formData)
    setIsPending(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }
    setSent(true)
    toast.success('お問い合わせを送信しました')
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        送信いただきありがとうございます。内容を確認のうえ、必要に応じてご連絡いたします。
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* ハニーポット: 人間には見えない欄。埋まっていたらボットとみなす */}
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="website">website</Label>
        <Input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">お名前</Label>
        <Input id="name" name="name" required maxLength={100} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">メールアドレス</Label>
        <Input id="email" name="email" type="email" required maxLength={200} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">お問い合わせ内容</Label>
        <Textarea id="message" name="message" rows={6} required maxLength={5000} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? '送信中...' : '送信する'}
      </Button>
    </form>
  )
}
