'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { syncDeckTags, type Tag } from './tags'

const deckSchema = z.object({
  name: z.string().min(1, 'デッキ名は必須です').max(100),
  description: z.string().max(500).optional(),
  genre: z.string().max(50).optional(),
  difficulty: z.coerce.number().int().min(1).max(5).default(1),
  tags: z.string().max(500).optional(),
  newCardsPerDay: z.coerce.number().int().min(0).max(9999).nullable().optional(),
  isPublic: z.boolean().default(false),
})

type DeckRow = {
  id: string
  owner_id: string
  name: string
  description: string | null
  genre: string | null
  difficulty: number
  is_public: boolean
  new_cards_per_day: number | null
  created_at: string
  updated_at: string
}

type DeckTagLink = { tags: Tag | null }
type DeckTagJoinRow = DeckRow & {
  deck_tags: DeckTagLink[] | null
}

function extractTags(deckTags: DeckTagLink[] | null | undefined): Tag[] {
  return (deckTags ?? [])
    .map((dt: DeckTagLink) => dt.tags)
    .filter((t: Tag | null): t is Tag => t !== null)
}

function toDeckRow(row: DeckRow): DeckRow {
  return {
    id: row.id,
    owner_id: row.owner_id,
    name: row.name,
    description: row.description,
    genre: row.genre,
    difficulty: row.difficulty,
    is_public: row.is_public,
    new_cards_per_day: row.new_cards_per_day,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function getDecks(tagName?: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('decks')
    .select('*, deck_tags(tags(id, name))')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  const decks = (data ?? []).map((deck) => {
    const row = deck as unknown as DeckTagJoinRow
    const tags = extractTags(row.deck_tags)
    return { ...toDeckRow(row), tags }
  })

  if (tagName) {
    return decks.filter((deck) => deck.tags.some((tag) => tag.name === tagName))
  }
  return decks
}

export async function getDeck(deckId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('decks')
    .select('*, deck_tags(tags(id, name))')
    .eq('id', deckId)
    .single()

  if (error) throw new Error(error.message)

  const row = data as unknown as DeckTagJoinRow
  const tags = extractTags(row.deck_tags)
  return { ...toDeckRow(row), tags }
}

export async function createDeck(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '認証されていません' }

  const rawNewCardsPerDay = formData.get('newCardsPerDay')

  const parsed = deckSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    genre: formData.get('genre') || undefined,
    difficulty: formData.get('difficulty') || 1,
    tags: formData.get('tags') || undefined,
    // 空文字は「上限なし」を意味するのでnullに変換する。未送信(null)の場合はundefinedのままにし、
    // z.object().optional()によりデフォルト値の扱いに委ねる。
    newCardsPerDay: rawNewCardsPerDay === '' ? null : rawNewCardsPerDay ?? undefined,
    isPublic: formData.get('isPublic') === 'true',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { tags, newCardsPerDay, isPublic, ...deckFields } = parsed.data

  const { data: deck, error } = await supabase
    .from('decks')
    .insert({
      owner_id: user.id,
      ...deckFields,
      is_public: isPublic,
      new_cards_per_day: newCardsPerDay ?? null,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }

  try {
    await syncDeckTags(deck.id, user.id, tags)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'タグの保存に失敗しました' }
  }

  revalidatePath('/decks')
  return { success: true }
}

export async function updateDeck(deckId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '認証されていません' }

  const rawNewCardsPerDay = formData.get('newCardsPerDay')

  const parsed = deckSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    genre: formData.get('genre') || undefined,
    difficulty: formData.get('difficulty') || 1,
    tags: formData.get('tags') || undefined,
    newCardsPerDay: rawNewCardsPerDay === '' ? null : rawNewCardsPerDay ?? undefined,
    isPublic: formData.get('isPublic') === 'true',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { tags, newCardsPerDay, isPublic, ...deckFields } = parsed.data

  const { error } = await supabase
    .from('decks')
    .update({
      ...deckFields,
      is_public: isPublic,
      new_cards_per_day: newCardsPerDay ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deckId)

  if (error) return { error: error.message }

  try {
    await syncDeckTags(deckId, user.id, tags)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'タグの保存に失敗しました' }
  }

  revalidatePath('/decks')
  return { success: true }
}

/**
 * オフラインキャッシュの同期用に、新規カード数上限だけを取得する軽量アクション。
 * デッキ全体(タグ結合込み)を取得するgetDeckより通信量が小さいため、
 * sync.ts側の頻繁な呼び出しにはこちらを使う。
 */
export async function getDeckNewCardsLimit(deckId: string): Promise<number | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('decks')
    .select('new_cards_per_day')
    .eq('id', deckId)
    .single()

  if (error || !data) return null
  return data.new_cards_per_day
}

export async function deleteDeck(deckId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('decks').delete().eq('id', deckId)
  if (error) return { error: error.message }

  revalidatePath('/decks')
  return { success: true }
}

export type PublicDeck = {
  id: string
  name: string
  description: string | null
  genre: string | null
  difficulty: number
  cardCount: number
}

/**
 * 公開デッキ(is_public = true)を一覧取得する。
 * decks_public_read ポリシーにより、所有者以外でもSELECTできる。
 */
export async function getPublicDecks(query?: string): Promise<PublicDeck[]> {
  const supabase = await createClient()
  let q = supabase
    .from('decks')
    .select('id, name, description, genre, difficulty, cards(count)')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(60)

  if (query?.trim()) {
    q = q.ilike('name', `%${query.trim()}%`)
  }

  const { data, error } = await q
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string
      name: string
      description: string | null
      genre: string | null
      difficulty: number
      cards: { count: number }[] | null
    }
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      genre: r.genre,
      difficulty: r.difficulty,
      cardCount: r.cards?.[0]?.count ?? 0,
    }
  })
}

export async function getPublicDeckWithCards(deckId: string) {
  const supabase = await createClient()
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, name, description, genre, difficulty')
    .eq('id', deckId)
    .eq('is_public', true)
    .single()
  if (deckError || !deck) return null

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('id, front, back, card_type, cloze_text')
    .eq('deck_id', deckId)
    .order('position', { ascending: true })
  if (cardsError) throw new Error(cardsError.message)

  return { deck, cards: cards ?? [] }
}

/**
 * 公開デッキを、ログイン中ユーザー自身のデッキとして複製する。
 * カード本体(表/裏/穴埋め)のみコピーし、学習履歴(card_reviews)はコピーしない
 * (=複製した人は新規カードとして自分のペースで学習を始める)。
 */
export async function cloneDeck(sourceDeckId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '認証されていません' }

  const source = await getPublicDeckWithCards(sourceDeckId)
  if (!source) return { error: '公開デッキが見つかりませんでした' }

  const { data: newDeck, error: deckError } = await supabase
    .from('decks')
    .insert({
      owner_id: user.id,
      name: source.deck.name,
      description: source.deck.description,
      genre: source.deck.genre,
      difficulty: source.deck.difficulty,
      is_public: false,
    })
    .select('id')
    .single()
  if (deckError || !newDeck) return { error: deckError?.message ?? 'デッキの複製に失敗しました' }

  if (source.cards.length > 0) {
    const rows = source.cards.map((c, i) => ({
      deck_id: newDeck.id,
      front: c.front,
      back: c.back,
      card_type: c.card_type,
      cloze_text: c.cloze_text,
      position: i,
    }))
    const { error: cardsError } = await supabase.from('cards').insert(rows)
    if (cardsError) return { error: cardsError.message }
  }

  revalidatePath('/decks')
  return { success: true, deckId: newDeck.id }
}
