import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasDueCardsForUser } from '@/lib/reminders/due-check'

export const maxDuration = 60

function currentJstHour(): number {
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return jstNow.getUTCHours()
}

function todayJstDateStr(): string {
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return jstNow.toISOString().slice(0, 10)
}

async function sendReminderEmail(to: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.REMINDER_FROM_EMAIL
  if (!apiKey || !fromEmail) {
    return { ok: false, error: 'RESEND_API_KEY または REMINDER_FROM_EMAIL が未設定です' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject: '今日のぶん、めくれますよ',
      html: `
        <p>今日めくれるカードが残っています。</p>
        <p><a href="https://mekuru.astro-root.com/decks">めくるを開く</a></p>
        <p style="color:#888;font-size:12px;margin-top:24px;">
          このメールは学習リマインダーの設定に基づいて送信されています。
          不要な場合はアプリの設定画面でオフにできます。
        </p>
      `,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { ok: false, error: `Resend API error (${res.status}): ${text}` }
  }
  return { ok: true }
}

/**
 * Vercel Cronから毎時(0分)呼ばれる想定。この時点のJST時刻と一致するremind_hour_jstを持ち、
 * まだ今日送信していない(last_sent_date !== 今日)ユーザーだけを対象にする。
 * 認証はCRON_SECRETによるBearerトークン照合のみ(Vercel Cronの標準的な保護方式)。
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const hour = currentJstHour()
  const today = todayJstDateStr()

  const { data: targets, error } = await admin
    .from('reminder_settings')
    .select('user_id')
    .eq('enabled', true)
    .eq('remind_hour_jst', hour)
    .or(`last_sent_date.is.null,last_sent_date.neq.${today}`)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let skippedNoDue = 0
  let failed = 0

  for (const target of targets ?? []) {
    try {
      const hasDue = await hasDueCardsForUser(admin, target.user_id)
      if (!hasDue) {
        skippedNoDue++
        continue
      }

      const { data: userData, error: userError } = await admin.auth.admin.getUserById(target.user_id)
      const email = userData?.user?.email
      if (userError || !email) {
        failed++
        continue
      }

      const result = await sendReminderEmail(email)
      if (!result.ok) {
        console.error('reminder email failed:', result.error)
        failed++
        continue
      }

      await admin.from('reminder_settings').update({ last_sent_date: today }).eq('user_id', target.user_id)
      sent++
    } catch (e) {
      console.error('reminder loop error:', e instanceof Error ? e.message : e)
      failed++
    }
  }

  return NextResponse.json({ hour, targetCount: targets?.length ?? 0, sent, skippedNoDue, failed })
}
