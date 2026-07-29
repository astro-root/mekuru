'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const cardSchema = z.object({
  front: z.string().min(1, '表面は必須です').max(2000),
  back: z.string().min(1, '裏面は必須です').max(2000),
  card_type: z.enum(['basic', 'cloze']).default('basic'),
  cloze_text: z.string().max(2000).optional(),
})

export async function getCards(deckId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function createCard(deckId: string, formData: FormData) {
  const supabase = await createClient()
  const parsed = cardSchema.safeParse({
    front: formData.get('front'),
    back: formData.get('back'),
    card_type: formData.get('card_type') || 'basic',
    cloze_text: formData.get('cloze_text') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.from('cards').insert({
    deck_id: deckId,
    ...parsed.data,
  })
  if (error) return { error: error.message }

  revalidatePath(`/decks/${deckId}`)
  return { success: true }
}

export async function updateCard(deckId: string, cardId: string, formData: FormData) {
  const supabase = await createClient()
  const parsed = cardSchema.safeParse({
    front: formData.get('front'),
    back: formData.get('back'),
    card_type: formData.get('card_type') || 'basic',
    cloze_text: formData.get('cloze_text') || undefined,
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
