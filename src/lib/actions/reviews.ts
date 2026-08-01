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
  position: number
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
  learning_steps?: number | null
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
    learning_steps: row.learning_steps ?? 0,
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
    .order('position', { ascending: true })
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
      position: card.position,
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

export async function submitReview(
  deckId: string,
  cardId: string,
  rating: ReviewRating,
  reviewedAt?: string
) {
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
      learning_steps: updated.learning_steps,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,card_id' }
  )
  if (upsertError) return { error: upsertError.message }

  // 復習ログに1件追記(ストリーク/統計表示用)。reviewedAtはオフライン時にキューへ積んだ
  // 実際の復習時刻。指定がなければサーバー受信時刻を使う。
  const { error: logError } = await supabase.from('review_logs').insert({
    user_id: user.id,
    card_id: cardId,
    deck_id: deckId,
    rating,
    reviewed_at: reviewedAt ?? new Date().toISOString(),
  })
  if (logError) {
    // ログ記録の失敗で復習自体を失敗扱いにはしない(統計が多少ずれるだけなので握りつぶす)
    console.error('review_logs insert failed:', logError.message)
  }

  revalidatePath(`/review/${deckId}`)
  return { success: true }
}

export type ReviewStats = {
  todayCount: number
  streak: number
}

export async function getReviewStats(): Promise<ReviewStats> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { todayCount: 0, streak: 0 }

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 60)

  const { data, error } = await supabase
    .from('review_logs')
    .select('reviewed_at')
    .eq('user_id', user.id)
    .gte('reviewed_at', since.toISOString())

  if (error || !data) return { todayCount: 0, streak: 0 }

  // 利用者は日本語話者(JST, UTC+9)を前提とするサービスのため、「今日」の判定は
  // UTCではなくJST基準で行う。UTC基準のままだと日本時間の朝方などにUTCの日付境界を
  // またぎ、「今日」の集計が実際の体感日とズレて0にリセットされたように見えてしまう。
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000
  const toJstDateStr = (iso: string) => new Date(new Date(iso).getTime() + JST_OFFSET_MS).toISOString().slice(0, 10)

  const dateStrings = new Set(data.map((r) => toJstDateStr(r.reviewed_at as string)))
  const todayStr = toJstDateStr(new Date().toISOString())
  const todayCount = data.filter((r) => toJstDateStr(r.reviewed_at as string) === todayStr).length

  let streak = 0
  const cursor = new Date(Date.now() + JST_OFFSET_MS)
  cursor.setUTCHours(0, 0, 0, 0)
  if (!dateStrings.has(todayStr)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  while (dateStrings.has(cursor.toISOString().slice(0, 10))) {
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return { todayCount, streak }
}

export type ReviewHistoryEntry = {
  id: string
  deckId: string
  deckName: string
  cardId: string
  front: string
  back: string
  rating: ReviewRating
  reviewedAt: string
}

type ReviewLogJoinRow = {
  id: string
  card_id: string
  deck_id: string
  rating: string
  reviewed_at: string
  cards: { front: string; back: string } | { front: string; back: string }[] | null
  decks: { name: string } | { name: string }[] | null
}

function firstOf<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

/** 直近の学習履歴(自分がめくって評価した問題)を新しい順に取得する */
export async function getReviewHistory(limit = 100): Promise<ReviewHistoryEntry[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('review_logs')
    .select('id, card_id, deck_id, rating, reviewed_at, cards(front, back), decks(name)')
    .eq('user_id', user.id)
    .order('reviewed_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return (data as unknown as ReviewLogJoinRow[]).map((row) => {
    const card = firstOf(row.cards)
    const deck = firstOf(row.decks)
    return {
      id: row.id,
      deckId: row.deck_id,
      deckName: deck?.name ?? '(削除済みデッキ)',
      cardId: row.card_id,
      front: card?.front ?? '(削除済みカード)',
      back: card?.back ?? '',
      rating: row.rating as ReviewRating,
      reviewedAt: row.reviewed_at,
    }
  })
}

