'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { chunkArray } from '@/lib/chunk'

const examGoalSchema = z.object({
  title: z.string().min(1, '試験名は必須です').max(100),
  examDate: z.string().min(1, '試験日は必須です'),
})

export type ExamGoal = {
  id: string
  title: string
  examDate: string
}

export type StudyPace = {
  goal: ExamGoal | null
  totalCards: number
  remainingCards: number
  daysRemaining: number | null
  suggestedPerDay: number | null
  isPastDue: boolean
}

/**
 * JST基準の「今日」を YYYY-MM-DD で返す(review-session.tsxと同じ考え方に揃える)
 */
function todayJst(): string {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

export async function setExamGoal(deckId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '認証されていません' }

  const parsed = examGoalSchema.safeParse({
    title: formData.get('title'),
    examDate: formData.get('examDate'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.from('exam_goals').upsert(
    {
      deck_id: deckId,
      owner_id: user.id,
      title: parsed.data.title,
      exam_date: parsed.data.examDate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'deck_id,owner_id' }
  )
  if (error) return { error: error.message }

  revalidatePath(`/decks/${deckId}`)
  return { success: true }
}

export async function deleteExamGoal(deckId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('exam_goals').delete().eq('deck_id', deckId)
  if (error) return { error: error.message }

  revalidatePath(`/decks/${deckId}`)
  return { success: true }
}

// 指定したカードIDのうち、既に1回でもレビューされた件数を数える。
// cardIdsが数百件を超えるとPostgRESTへの.in()クエリのURLが長大になり失敗しやすいため、
// チャンクに分割してそれぞれの件数を合算する。
async function countReviewedCards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  cardIds: string[]
): Promise<number> {
  if (cardIds.length === 0) return 0

  const chunks = chunkArray(cardIds)
  const counts = await Promise.all(
    chunks.map(async (chunk) => {
      const { count, error } = await supabase
        .from('card_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('card_id', chunk)
      if (error) throw new Error(error.message)
      return count ?? 0
    })
  )
  return counts.reduce((sum, c) => sum + c, 0)
}

/**
 * 試験日までの残り日数と、未学習カードを踏まえた1日あたりの推奨学習ペースを算出する。
 * 「未学習カード」= まだ一度もレビューしていないカード(card_reviewsに行が無いカード)。
 * これはgetDeckCardsWithStateが新規カードをcreateEmptyCard()扱いする基準と揃えている。
 */
export async function getStudyPace(deckId: string): Promise<StudyPace> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('認証されていません')

  const [{ data: goalRow }, { data: cards, error: cardsError }] = await Promise.all([
    supabase
      .from('exam_goals')
      .select('id, title, exam_date')
      .eq('deck_id', deckId)
      .eq('owner_id', user.id)
      .maybeSingle(),
    supabase.from('cards').select('id').eq('deck_id', deckId),
  ])
  if (cardsError) throw new Error(cardsError.message)

  const cardIds = (cards ?? []).map((c) => c.id)
  const reviewedCount = await countReviewedCards(supabase, user.id, cardIds)

  const totalCards = cardIds.length
  const remainingCards = Math.max(totalCards - reviewedCount, 0)

  if (!goalRow) {
    return {
      goal: null,
      totalCards,
      remainingCards,
      daysRemaining: null,
      suggestedPerDay: null,
      isPastDue: false,
    }
  }

  const today = todayJst()
  const daysRemaining = Math.ceil(
    (new Date(goalRow.exam_date + 'T00:00:00+09:00').getTime() -
      new Date(today + 'T00:00:00+09:00').getTime()) /
      (1000 * 60 * 60 * 24)
  )
  const isPastDue = daysRemaining < 0
  const suggestedPerDay =
    remainingCards === 0
      ? 0
      : daysRemaining > 0
        ? Math.ceil(remainingCards / daysRemaining)
        : remainingCards

  return {
    goal: { id: goalRow.id, title: goalRow.title, examDate: goalRow.exam_date },
    totalCards,
    remainingCards,
    daysRemaining,
    suggestedPerDay,
    isPastDue,
  }
}
