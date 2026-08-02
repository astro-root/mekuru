'use client'

import { useState, useTransition } from 'react'
import { updateReminderSettings, type ReminderSettings } from '@/lib/actions/reminders'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h)

export function ReminderSection({ initialSettings }: { initialSettings: ReminderSettings }) {
  const [enabled, setEnabled] = useState(initialSettings.enabled)
  const [remindHourJst, setRemindHourJst] = useState(initialSettings.remindHourJst)
  const [isPending, startTransition] = useTransition()

  function save(next: { enabled: boolean; remindHourJst: number }) {
    startTransition(async () => {
      const result = await updateReminderSettings(next)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('リマインダー設定を保存しました')
    })
  }

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    save({ enabled: next, remindHourJst })
  }

  function handleHourChange(value: string) {
    const hour = Number(value)
    setRemindHourJst(hour)
    save({ enabled, remindHourJst: hour })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-sm font-bold">学習リマインダー</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        今日めくれるカードが残っている場合に、指定した時刻(日本時間)にメールでお知らせします。
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
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
        <Select
          value={String(remindHourJst)}
          onValueChange={handleHourChange}
          disabled={!enabled || isPending}
        >
          <SelectTrigger className="w-28 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOUR_OPTIONS.map((h) => (
              <SelectItem key={h} value={String(h)}>
                {h}:00
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
