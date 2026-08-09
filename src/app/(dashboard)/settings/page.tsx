import type { Metadata } from "next";
import { AccountSection } from '@/components/settings/account-section'
import { DeleteAccountSection } from '@/components/settings/delete-account-section'
import { BackupSection } from '@/components/settings/backup-section'
import { ReminderSection } from '@/components/settings/reminder-section'
import { getReminderSettings } from '@/lib/actions/reminders'

export const metadata: Metadata = {
  title: "設定",
}

export default async function SettingsPage() {
  const reminderSettings = await getReminderSettings()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold">設定</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          アカウントに関する設定を管理できます。
        </p>
      </div>

      <AccountSection />
      <ReminderSection initialSettings={reminderSettings} />
      <BackupSection />

      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <h2 className="font-heading text-sm font-bold text-destructive">危険な操作</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          アカウントを削除すると、作成した全てのデッキ・カード・学習履歴が完全に削除されます。
          この操作は取り消せません。
        </p>
        <DeleteAccountSection />
      </div>
    </div>
  )
}
