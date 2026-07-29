'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const deckSchema = z.object({
  name: z.string().min(1, 'デッキ名は必須です').max(100),
  description: z.string().max(500).optional(),
  genre: z.string().max(50).optional(),
  difficulty: z.coerce.number().int().min(1).max(5).default(1),
})

export async function getDecks() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getDeck(deckId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .single()

  if (error) throw new Error(error.message)
  return data
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
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.from('decks').insert({
    owner_id: user.id,
    ...parsed.data,
  })
  if (error) return { error: error.message }

  revalidatePath('/decks')
  return { success: true }
}

export async function updateDeck(deckId: string, formData: FormData) {
  const supabase = await createClient()
  const parsed = deckSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    genre: formData.get('genre') || undefined,
    difficulty: formData.get('difficulty') || 1,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('decks')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', deckId)

  if (error) return { error: error.message }

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
