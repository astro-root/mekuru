'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * ログインユーザーの全データ(デッキ・タグ・カード・FSRS状態・復習ログ)を取得する。
 * 各テーブルのRLSポリシー(owner_id/user_id = auth.uid())により、
 * 自分が所有するデータだけが自動的に返る。
 */
export async function getFullBackup() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '認証されていません' }

  const [decks, tags, deckTags, cards, cardReviews, reviewLogs] = await Promise.all([
    supabase.from('decks').select('*'),
    supabase.from('tags').select('*'),
    supabase.from('deck_tags').select('*'),
    supabase.from('cards').select('*'),
    supabase.from('card_reviews').select('*'),
    supabase.from('review_logs').select('*'),
  ])

  const firstError = [decks, tags, deckTags, cards, cardReviews, reviewLogs].find((r) => r.error)
  if (firstError?.error) return { error: firstError.error.message }

  return {
    success: true,
    data: {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      decks: decks.data ?? [],
      tags: tags.data ?? [],
      deck_tags: deckTags.data ?? [],
      cards: cards.data ?? [],
      card_reviews: cardReviews.data ?? [],
      review_logs: reviewLogs.data ?? [],
    },
  }
}
