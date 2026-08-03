'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { backupSchema, MAX_BACKUP_CARDS, BACKUP_SCHEMA_VERSION, type DeckBackup } from '@/lib/import-export/backup'
import { getCardTagsByCardIds, syncCardTags } from '@/lib/actions/tags'

async function getNextPosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  deckId: string
): Promise<number> {
  const { data } = await supabase
    .from('cards')
    .select('position')
    .eq('deck_id', deckId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.position ?? 0) + 1
}

export async function getDeckBackup(deckId: string): Promise<DeckBackup | { error: string }> {
  const supabase = await createClient()

  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('name, description, genre, difficulty')
    .eq('id', deckId)
    .maybeSingle()
  if (deckError) return { error: deckError.message }
  if (!deck) return { error: 'デッキが見つかりません' }

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('id, front, back, cloze_text, card_type, note, is_favorite, is_suspended')
    .eq('deck_id', deckId)
    .order('position', { ascending: true })
  if (cardsError) return { error: cardsError.message }

  const cardIds = (cards ?? []).map((c) => c.id)
  const tagsByCardId = await getCardTagsByCardIds(cardIds)
  const reviewByCardId = new Map<
    string,
    {
      due: string
      stability: number
      difficulty: number
      elapsed_days: number
      scheduled_days: number
      reps: number
      lapses: number
      state: number
      last_review: string | null
    }
  >()

  if (cardIds.length > 0) {
    const { data: reviews, error: reviewsError } = await supabase
      .from('card_reviews')
      .select('card_id, due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review')
      .in('card_id', cardIds)
    if (reviewsError) return { error: reviewsError.message }
    for (const r of reviews ?? []) {
      reviewByCardId.set(r.card_id, {
        due: r.due,
        stability: r.stability,
        difficulty: r.difficulty,
        elapsed_days: r.elapsed_days,
        scheduled_days: r.scheduled_days,
        reps: r.reps,
        lapses: r.lapses,
        state: r.state,
        last_review: r.last_review,
      })
    }
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    deck: {
      name: deck.name,
      description: deck.description,
      genre: deck.genre,
      difficulty: deck.difficulty,
    },
    cards: (cards ?? []).map((c) => ({
      front: c.front,
      back: c.back,
      card_type: c.card_type as 'basic' | 'cloze',
      cloze_text: c.cloze_text,
      note: c.note,
      tags: (tagsByCardId[c.id] ?? []).map((t) => t.name),
      is_favorite: c.is_favorite,
      is_suspended: c.is_suspended,
      review: reviewByCardId.get(c.id) ?? null,
    })),
  }
}

export async function restoreDeckBackup(deckId: string, rawBackup: unknown) {
  const parsed = backupSchema.safeParse(rawBackup)
  if (!parsed.success) {
    return { error: 'バックアップファイルの形式が正しくありません。' }
  }
  const backup = parsed.data

  if (backup.cards.length === 0) {
    return { error: '復元するカードがありません' }
  }
  if (backup.cards.length > MAX_BACKUP_CARDS) {
    return { error: `1回の復元は最大${MAX_BACKUP_CARDS}枚までです` }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  const startPosition = await getNextPosition(supabase, deckId)

  const cardPayload = backup.cards.map((c, i) => ({
    deck_id: deckId,
    front: c.front,
    back: c.back,
    card_type: c.card_type,
    cloze_text: c.cloze_text ?? null,
    note: c.note ?? null,
    is_favorite: c.is_favorite ?? false,
    is_suspended: c.is_suspended ?? false,
    position: startPosition + i,
  }))

  // RLS(decks_owner_all経由のcards_owner_via_deck相当)により、
  // deckIdが自分のデッキでない場合はここで拒否される
  const { data: insertedCards, error: insertError } = await supabase
    .from('cards')
    .insert(cardPayload)
    .select('id, position')
  if (insertError) return { error: insertError.message }
  if (!insertedCards) return { error: 'カードの登録に失敗しました' }

  // insert直後の並び順はDBの実装依存のため、position(このリクエストで採番した値)で
  // 確実に元のbackup.cardsの順番へ対応付ける
  const sortedInserted = [...insertedCards].sort((a, b) => a.position - b.position)

  const reviewPayload = sortedInserted
    .map((row, i) => ({ row, review: backup.cards[i].review }))
    .filter((x): x is { row: (typeof sortedInserted)[number]; review: NonNullable<typeof x.review> } => !!x.review)
    .map(({ row, review }) => ({
      user_id: user.id,
      card_id: row.id,
      due: review.due,
      stability: review.stability,
      difficulty: review.difficulty,
      elapsed_days: review.elapsed_days,
      scheduled_days: review.scheduled_days,
      reps: review.reps,
      lapses: review.lapses,
      state: review.state,
      last_review: review.last_review ?? null,
    }))

  if (reviewPayload.length > 0) {
    const { error: reviewError } = await supabase.from('card_reviews').insert(reviewPayload)
    if (reviewError) {
      return {
        error: `カードは復元されましたが、学習状態の復元に失敗しました: ${reviewError.message}`,
      }
    }
  }

  // タグの復元(失敗してもカード自体は復元済みなので、エラーはログに留めて処理は続行する)
  let tagRestoreFailed = false
  for (let i = 0; i < sortedInserted.length; i++) {
    const tags = backup.cards[i].tags
    if (!tags || tags.length === 0) continue
    try {
      await syncCardTags(sortedInserted[i].id, user.id, tags.join(','))
    } catch (e) {
      tagRestoreFailed = true
      console.error('tag restore failed:', e instanceof Error ? e.message : e)
    }
  }

  revalidatePath(`/decks/${deckId}`)
  return {
    success: true,
    count: sortedInserted.length,
    restoredReviews: reviewPayload.length,
    tagRestoreFailed,
  }
}
