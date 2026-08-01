'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const cardSchema = z.object({
  front: z.string().min(1, '表面は必須です').max(2000),
  back: z.string().min(1, '裏面は必須です').max(2000),
  card_type: z.enum(['basic', 'cloze']).default('basic'),
  cloze_text: z.string().max(2000).optional(),
  note: z.string().max(2000).optional(),
})

export async function getCards(deckId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
    .order('position', { ascending: true })

  if (error) throw new Error(error.message)
  return data
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
  const parsed = cardSchema.safeParse({
    front: formData.get('front'),
    back: formData.get('back'),
    card_type: formData.get('card_type') || 'basic',
    cloze_text: formData.get('cloze_text') || undefined,
    note: formData.get('note') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const position = await getNextPosition(supabase, deckId)

  const { error } = await supabase.from('cards').insert({
    deck_id: deckId,
    position,
    ...parsed.data,
  })
  if (error) return { error: error.message }

  revalidatePath(`/decks/${deckId}`)
  return { success: true }
}

export async function createCardsBulk(
  deckId: string,
  rows: { front: string; back: string; note?: string }[]
) {
  const supabase = await createClient()
  if (rows.length === 0) return { error: '登録するカードがありません' }

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
  const parsed = cardSchema.safeParse({
    front: formData.get('front'),
    back: formData.get('back'),
    card_type: formData.get('card_type') || 'basic',
    cloze_text: formData.get('cloze_text') || undefined,
    note: formData.get('note') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('cards')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', cardId)

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
