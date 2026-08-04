'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().trim().min(1, 'お名前を入力してください').max(100),
  email: z.string().trim().min(1, 'メールアドレスを入力してください').email('メールアドレスの形式が正しくありません').max(200),
  message: z.string().trim().min(1, 'お問い合わせ内容を入力してください').max(5000),
  // ボット対策のハニーポット。人間には見えない入力欄で、値が入っていたら送信を静かに無視する。
  website: z.string().max(0).optional(),
})

export async function submitContactMessage(formData: FormData) {
  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
    website: formData.get('website') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // ハニーポットに何か入っていればボットとみなし、成功したふりをして終える。
  if (parsed.data.website) {
    return { success: true }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('contact_messages').insert({
    name: parsed.data.name,
    email: parsed.data.email,
    message: parsed.data.message,
  })
  if (error) return { error: '送信に失敗しました。時間をおいて再度お試しください。' }

  return { success: true }
}
