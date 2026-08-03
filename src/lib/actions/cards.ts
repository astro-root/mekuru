'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { syncCardTags, getCardTagsByCardIds, type Tag } from './tags'

const cardSchema = z.object({
  front: z.string().min(1, '表面は必須です').max(2000),
  back: z.string().min(1, '裏面は必須です').max(2000),
  card_type: z.enum(['basic', 'cloze']).default('basic'),
  cloze_text: z.string().max(2000).optional(),
  note: z.string().max(2000).optional(),
  tags: z.string().max(500).optional(),
})

export async function getCards(deckId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
    .order('position', { ascending: true })

  if (error) throw new Error(error.message)

  const cards = data ?? []
  const tagsByCardId = await getCardTagsByCardIds(cards.map((c) => c.id))
  return cards.map((c) => ({ ...c, tags: tagsByCardId[c.id] ?? ([] as Tag[]) }))
}

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

export async function createCard(deckId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '認証されていません' }

  const parsed = cardSchema.safeParse({
    front: formData.get('front'),
    back: formData.get('back'),
    card_type: formData.get('card_type') || 'basic',
    cloze_text: formData.get('cloze_text') || undefined,
    note: formData.get('note') || undefined,
    tags: formData.get('tags') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const alsoCreateReversed = formData.get('also_create_reversed') === 'on' && parsed.data.card_type === 'basic'

  const { tags, ...cardFields } = parsed.data
  const position = await getNextPosition(supabase, deckId)

  const insertRows = alsoCreateReversed
    ? [
        { deck_id: deckId, position, ...cardFields },
        {
          deck_id: deckId,
          position: position + 1,
          ...cardFields,
          front: cardFields.back,
          back: cardFields.front,
        },
      ]
    : [{ deck_id: deckId, position, ...cardFields }]

  const { data: insertedCards, error } = await supabase.from('cards').insert(insertRows).select('id')
  if (error) return { error: error.message }

  try {
    for (const c of insertedCards ?? []) {
      await syncCardTags(c.id, user.id, tags)
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'タグの保存に失敗しました' }
  }

  revalidatePath(`/decks/${deckId}`)
  return { success: true }
}

export async function createCardsBulk(
  deckId: string,
  rows: { front: string; back: string; note?: string }[]
) {
  const supabase = await createClient()
  if (rows.length === 0) return { error: '登録するカードがありません' }
  if (rows.length > 3000) return { error: '1回のインポートは最大3000枚までです' }

  const startPosition = await getNextPosition(supabase, deckId)

  // rowsの並び(=CSV/Excelの読み込み順)をそのままpositionに反映し、
  // インポート順と表示順が一致するようにする
  const payload = rows.map((r, i) => ({
    deck_id: deckId,
    front: r.front,
    back: r.back,
    note: r.note || null,
    card_type: 'basic' as const,
    position: startPosition + i,
  }))

  const { error, count } = await supabase.from('cards').insert(payload, { count: 'exact' })
  if (error) return { error: error.message }

  revalidatePath(`/decks/${deckId}`)
  return { success: true, count: count ?? rows.length }
}

export async function updateCard(deckId: string, cardId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '認証されていません' }

  const parsed = cardSchema.safeParse({
    front: formData.get('front'),
    back: formData.get('back'),
    card_type: formData.get('card_type') || 'basic',
    cloze_text: formData.get('cloze_text') || undefined,
    note: formData.get('note') || undefined,
    tags: formData.get('tags') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { tags, ...cardFields } = parsed.data

  const { error } = await supabase
    .from('cards')
    .update({ ...cardFields, updated_at: new Date().toISOString() })
    .eq('id', cardId)

  if (error) return { error: error.message }

  try {
    await syncCardTags(cardId, user.id, tags)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'タグの保存に失敗しました' }
  }

  revalidatePath(`/decks/${deckId}`)
  return { success: true }
}

export type CardSearchResult = {
  id: string
  deckId: string
  deckName: string
  front: string
  back: string
  note: string | null
}

// 複数デッキをまたいでカードの表・裏・コメント・穴埋め文を検索する(RLSにより自分のカードのみ対象)
export async function searchCardsAcrossDecks(query: string, limit = 50): Promise<CardSearchResult[]> {
  const q = query.trim()
  if (q.length === 0) return []

  const supabase = await createClient()
  const escaped = q.replace(/[%_]/g, (m) => `\\${m}`)
  const pattern = `%${escaped}%`

  const { data, error } = await supabase
    .from('cards')
    .select('id, front, back, note, deck_id, decks(name)')
    .or(`front.ilike.${pattern},back.ilike.${pattern},note.ilike.${pattern},cloze_text.ilike.${pattern}`)
    .limit(limit)

  if (error || !data) return []

  type Row = {
    id: string
    front: string
    back: string
    note: string | null
    deck_id: string
    decks: { name: string } | { name: string }[] | null
  }

  return (data as unknown as Row[]).map((row) => {
    const deck = Array.isArray(row.decks) ? row.decks[0] : row.decks
    return {
      id: row.id,
      deckId: row.deck_id,
      deckName: deck?.name ?? '(削除済みデッキ)',
      front: row.front,
      back: row.back,
      note: row.note,
    }
  })
}

export async function createReversedCard(deckId: string, cardId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '認証されていません' }

  const { data: source, error: fetchError } = await supabase
    .from('cards')
    .select('front, back, card_type, note')
    .eq('id', cardId)
    .maybeSingle()
  if (fetchError) return { error: fetchError.message }
  if (!source) return { error: 'カードが見つかりません' }
  if (source.card_type !== 'basic') {
    return { error: '逆方向のカードは「表→裏」形式のみ作成できます' }
  }

  const tagsByCardId = await getCardTagsByCardIds([cardId])
  const tagNames = (tagsByCardId[cardId] ?? []).map((t) => t.name)

  const position = await getNextPosition(supabase, deckId)
  const { data: created, error } = await supabase
    .from('cards')
    .insert({
      deck_id: deckId,
      position,
      front: source.back,
      back: source.front,
      card_type: 'basic',
      note: source.note,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }

  try {
    await syncCardTags(created.id, user.id, tagNames.join(','))
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'タグの保存に失敗しました' }
  }

  revalidatePath(`/decks/${deckId}`)
  return { success: true }
}

export async function toggleCardFavorite(deckId: string, cardId: string, next: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('cards').update({ is_favorite: next }).eq('id', cardId)
  if (error) return { error: error.message }
  revalidatePath(`/decks/${deckId}`)
  return { success: true }
}

export async function toggleCardSuspended(deckId: string, cardId: string, next: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('cards').update({ is_suspended: next }).eq('id', cardId)
  if (error) return { error: error.message }
  revalidatePath(`/decks/${deckId}`)
  return { success: true }
}

export async function deleteCard(deckId: string, cardId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('cards').delete().eq('id', cardId)
  if (error) return { error: error.message }

  revalidatePath(`/decks/${deckId}`)
  return { success: true }
}
