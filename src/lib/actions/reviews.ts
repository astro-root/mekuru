'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { scheduleReview, isDue, type ReviewRating } from '@/lib/fsrs/scheduler'
import { createEmptyCard, State, type Card } from 'ts-fsrs'

export type CardWithState = {
  id: string
  front: string
  back: string
  card_type: string
  cloze_text: string | null
  note: string | null
  fsrsCard: Card
}

export type DueCard = {
  id: string
  front: string
  back: string
  card_type: string
  cloze_text: string | null
  note: string | null
  due: string
  state: number
}

function rowToFsrsCard(row: {
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  state: number
  last_review: string | null
}): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  }
}

export async function getDeckCardsWithState(deckId: string): Promise<CardWithState[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('認証されていません')

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
  if (cardsError) throw new Error(cardsError.message)
  if (!cards) return []

  const { data: reviews, error: reviewsError } = await supabase
    .from('card_reviews')
    .select('*')
    .eq('user_id', user.id)
    .in(
      'card_id',
      cards.map((c) => c.id)
    )
  if (reviewsError) throw new Error(reviewsError.message)

  const reviewByCardId = new Map(reviews?.map((r) => [r.card_id, r]) ?? [])

  return cards.map((card) => {
    const reviewRow = reviewByCardId.get(card.id)
    return {
      id: card.id,
      front: card.front,
      back: card.back,
      card_type: card.card_type,
      cloze_text: card.cloze_text,
      note: card.note,
      fsrsCard: reviewRow ? rowToFsrsCard(reviewRow) : createEmptyCard(),
    }
  })
}

export async function getDueCards(deckId: string): Promise<DueCard[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('認証されていません')

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
  if (cardsError) throw new Error(cardsError.message)
  if (!cards || cards.length === 0) return []

  const { data: reviews, error: reviewsError } = await supabase
    .from('card_reviews')
    .select('*')
    .eq('user_id', user.id)
    .in(
      'card_id',
      cards.map((c) => c.id)
    )
  if (reviewsError) throw new Error(reviewsError.message)

  const reviewByCardId = new Map(reviews?.map((r) => [r.card_id, r]) ?? [])
  const now = new Date()

  const due: DueCard[] = []
  for (const card of cards) {
    const reviewRow = reviewByCardId.get(card.id)
    if (!reviewRow) {
      // 未学習カードは常に出題対象
      due.push({
        id: card.id,
        front: card.front,
        back: card.back,
        card_type: card.card_type,
        cloze_text: card.cloze_text,
        note: card.note,
        due: now.toISOString(),
        state: State.New,
      })
      continue
    }
    const fsrsCard = rowToFsrsCard(reviewRow)
    if (isDue(fsrsCard, now)) {
      due.push({
        id: card.id,
        front: card.front,
        back: card.back,
        card_type: card.card_type,
        cloze_text: card.cloze_text,
        note: card.note,
        due: reviewRow.due,
        state: reviewRow.state,
      })
    }
  }

  due.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
  return due
}

export async function submitReview(deckId: string, cardId: string, rating: ReviewRating) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '認証されていません' }

  const { data: existingRow, error: fetchError } = await supabase
    .from('card_reviews')
    .select('*')
    .eq('user_id', user.id)
    .eq('card_id', cardId)
    .maybeSingle()
  if (fetchError) return { error: fetchError.message }

  const currentCard = existingRow ? rowToFsrsCard(existingRow) : createEmptyCard()
  const result = scheduleReview(currentCard, rating)
  const updated = result.card

  const { error: upsertError } = await supabase.from('card_reviews').upsert(
    {
      user_id: user.id,
      card_id: cardId,
      due: updated.due.toISOString(),
      stability: updated.stability,
      difficulty: updated.difficulty,
      elapsed_days: updated.elapsed_days,
      scheduled_days: updated.scheduled_days,
      reps: updated.reps,
      lapses: updated.lapses,
      state: updated.state,
      last_review: updated.last_review ? updated.last_review.toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,card_id' }
  )
  if (upsertError) return { error: upsertError.message }

  revalidatePath(`/review/${deckId}`)
  return { success: true }
}
