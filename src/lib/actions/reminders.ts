'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type ReminderSettings = {
  enabled: boolean
  remindHourJst: number
}

const DEFAULT_SETTINGS: ReminderSettings = { enabled: false, remindHourJst: 20 }

export async function getReminderSettings(): Promise<ReminderSettings> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return DEFAULT_SETTINGS

  const { data, error } = await supabase
    .from('reminder_settings')
    .select('enabled, remind_hour_jst')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return DEFAULT_SETTINGS
  return { enabled: data.enabled, remindHourJst: data.remind_hour_jst }
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  remindHourJst: z.coerce.number().int().min(0).max(23),
})

export async function updateReminderSettings(input: { enabled: boolean; remindHourJst: number }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '認証されていません' }

  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // 通知時刻を変更した場合、その日はまだ新しい時刻を迎えていない可能性があるため
  // last_sent_dateはリセットしない(前回送信済みなら今日はもう送らない、が既定の挙動)。
  const { error } = await supabase.from('reminder_settings').upsert(
    {
      user_id: user.id,
      enabled: parsed.data.enabled,
      remind_hour_jst: parsed.data.remindHourJst,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}
