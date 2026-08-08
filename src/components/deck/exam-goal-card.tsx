'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { CalendarClock, Trash2 } from 'lucide-react'
import { setExamGoal, deleteExamGoal, type StudyPace } from '@/lib/actions/exam-goals'
import { toast } from 'sonner'

export function ExamGoalCard({ deckId, pace }: { deckId: string; pace: StudyPace }) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    const result = await setExamGoal(deckId, formData)
    setIsPending(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('試験日を設定しました')
    setOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    setIsPending(true)
    const result = await deleteExamGoal(deckId)
    setIsPending(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('試験日の設定を解除しました')
    router.refresh()
  }

  if (!pace.goal) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <CalendarClock className="mr-1 h-4 w-4" />
            試験日を設定
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">試験日から逆算する</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">試験名</Label>
              <Input id="title" name="title" placeholder="例: 定期テスト、〇〇大学入試" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="examDate">試験日</Label>
              <Input id="examDate" name="examDate" type="date" required />
            </div>
            <p className="text-xs text-muted-foreground">
              残り日数と未学習カード数から、1日あたりの目安ペースを表示します。
            </p>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? '保存中...' : '設定する'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  const { goal, daysRemaining, remainingCards, suggestedPerDay, isPastDue } = pace

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
      <CalendarClock className="h-5 w-5 shrink-0 text-primary" strokeWidth={2} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {goal.title}
          <span className="ml-2 font-mono text-xs text-muted-foreground">{goal.examDate}</span>
        </p>
        {isPastDue ? (
          <p className="mt-0.5 text-xs text-muted-foreground">試験日を過ぎています</p>
        ) : (
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            残り{daysRemaining}日・未学習{remainingCards}枚
            {suggestedPerDay !== null && suggestedPerDay > 0 && (
              <> → 1日あたり{suggestedPerDay}枚が目安です</>
            )}
          </p>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost">
            編集
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">試験日を編集</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">試験名</Label>
              <Input id="title" name="title" defaultValue={goal.title} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="examDate">試験日</Label>
              <Input id="examDate" name="examDate" type="date" defaultValue={goal.examDate} required />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? '保存中...' : '更新する'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Button size="sm" variant="ghost" onClick={handleDelete} disabled={isPending}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
