'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type ContactMessage = {
  id: string
  name: string
  email: string
  message: string
  status: 'new' | 'read' | 'replied'
  created_at: string
}

/** ログイン中のユーザーが管理者(ADMIN_EMAILと一致)かどうかを判定する */
async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return { ok: false, error: 'ADMIN_EMAIL が設定されていません' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== adminEmail) {
    return { ok: false, error: '権限がありません' }
  }
  return { ok: true }
}

export async function getContactMessages(): Promise<{ data?: ContactMessage[]; error?: string }> {
  const guard = await requireAdmin()
  if (!guard.ok) return { error: guard.error }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('contact_messages')
    .select('id, name, email, message, status, created_at')
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data: data as ContactMessage[] }
}

export async function updateContactMessageStatus(id: string, status: ContactMessage['status']) {
  const guard = await requireAdmin()
  if (!guard.ok) return { error: guard.error }

  const admin = createAdminClient()
  const { error } = await admin.from('contact_messages').update({ status }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/contact')
  return { success: true }
}
