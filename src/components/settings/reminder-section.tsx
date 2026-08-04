'use client'

import { useState, useTransition } from 'react'
import { updateReminderSettings, type ReminderSettings } from '@/lib/actions/reminders'
import { Button } from '@/components/ui/button'
import { Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'

export function ReminderSection({ initialSettings }: { initialSettings: ReminderSettings }) {
  const [enabled, setEnabled] = useState(initialSettings.enabled)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    startTransition(async () => {
      const result = await updateReminderSettings({ enabled: next, remindHourJst: initialSettings.remindHourJst })
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('リマインダー設定を保存しました')
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-sm font-bold">学習リマインダー</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        今日めくれるカードが残っている場合に、毎日20:00(日本時間)ごろメールでお知らせします。
      </p>
      <div className="mt-3">
        <Button
          type="button"
          variant={enabled ? 'default' : 'outline'}
          size="sm"
          disabled={isPending}
          onClick={handleToggle}
        >
          {enabled ? <Bell className="mr-1 h-4 w-4" /> : <BellOff className="mr-1 h-4 w-4" />}
          {enabled ? 'オン' : 'オフ'}
        </Button>
      </div>
    </div>
  )
}
