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
})

type DeckRow = {
  id: string
  owner_id: string
  name: string
  description: string | null
  genre: string | null
  difficulty: number
  is_public: boolean
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

  const parsed = deckSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    genre: formData.get('genre') || undefined,
    difficulty: formData.get('difficulty') || 1,
    tags: formData.get('tags') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { tags, ...deckFields } = parsed.data

  const { data: deck, error } = await supabase
    .from('decks')
    .insert({
      owner_id: user.id,
      ...deckFields,
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

  const parsed = deckSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    genre: formData.get('genre') || undefined,
    difficulty: formData.get('difficulty') || 1,
    tags: formData.get('tags') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { tags, ...deckFields } = parsed.data

  const { error } = await supabase
    .from('decks')
    .update({ ...deckFields, updated_at: new Date().toISOString() })
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

export async function deleteDeck(deckId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('decks').delete().eq('id', deckId)
  if (error) return { error: error.message }

  revalidatePath('/decks')
  return { success: true }
}
