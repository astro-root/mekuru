import type { SupabaseClient } from '@supabase/supabase-js'
import { isDue } from '@/lib/fsrs/scheduler'
import { State, type Card } from 'ts-fsrs'

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

/**
 * 指定ユーザーに「今日めくれるカード」が1枚でもあるかを判定する。
 * admin clientを使うためRLSを経由しないので、必ずuserIdで絞り込んだクエリのみを発行すること。
 * getDueCountsByDeck(reviews.ts)と同じロジックだが、通知の要否判定だけなので
 * 全件カウントはせず、見つかり次第trueを返して早期終了する。
 */
export async function hasDueCardsForUser(admin: SupabaseClient<any, any, any>, userId: string): Promise<boolean> {  const { data: decks, error: decksError } = await admin
    .from('decks')
    .select('id, new_cards_per_day')
    .eq('owner_id', userId)
  if (decksError || !decks || decks.length === 0) return false

  const deckIds = decks.map((d) => d.id)
  const newCardsLimitByDeck = new Map(decks.map((d) => [d.id, d.new_cards_per_day as number | null]))

  const { data: cards, error: cardsError } = await admin
    .from('cards')
    .select('id, deck_id')
    .in('deck_id', deckIds)
    .order('position', { ascending: true })
  if (cardsError || !cards || cards.length === 0) return false

  const { data: reviews, error: reviewsError } = await admin
    .from('card_reviews')
    .select('*')
    .eq('user_id', userId)
  if (reviewsError) return false

  const reviewByCardId = new Map((reviews ?? []).map((r) => [r.card_id, r]))
  const now = new Date()
  const newCardsIntroducedByDeck: Record<string, number> = {}

  for (const card of cards) {
    const reviewRow = reviewByCardId.get(card.id)

    if (!reviewRow) {
      const limit = newCardsLimitByDeck.get(card.deck_id) ?? null
      const introduced = newCardsIntroducedByDeck[card.deck_id] ?? 0
      if (limit !== null && introduced >= limit) continue
      return true // 未学習カードが上限内で見つかった
    }

    if (reviewRow.state !== State.New && isDue(rowToFsrsCard(reviewRow), now)) {
      return true // 復習期限を迎えたカードが見つかった
    }
    // reviewRowが存在してstate===Newのケースは通常発生しない(未学習ならreviewRow自体が無い)が、
    // 念のためnewCardsIntroducedByDeckのカウントは崩さずスキップする。
  }

  return false
}
