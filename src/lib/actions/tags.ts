'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Tag = {
  id: string
  name: string
}

// PostgREST(Supabase)への .in() フィルターはGETのクエリ文字列に展開されるため、
// カードIDを無制限に1回のクエリへ詰め込むとURLが長大になり、
// プロキシ/CDN側のURL長制限に引っかかってリクエストごと失敗することがある。
// そのため一定件数ごとに分割してクエリを投げる。
const CARD_TAGS_CHUNK_SIZE = 200

export async function getAllTags(): Promise<Tag[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tags')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

function parseTagNames(raw: string | null | undefined): string[] {
  if (!raw) return []
  const names = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return Array.from(new Set(names))
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

async function upsertTags(ownerId: string, names: string[]): Promise<Tag[]> {
  const supabase = await createClient()
  if (names.length === 0) return []

  const { data: existing, error: fetchError } = await supabase
    .from('tags')
    .select('id, name')
    .eq('owner_id', ownerId)
    .in('name', names)

  if (fetchError) throw new Error(fetchError.message)

  const existingNames = new Set((existing ?? []).map((t) => t.name))
  const missingNames = names.filter((n) => !existingNames.has(n))

  let created: Tag[] = []
  if (missingNames.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('tags')
      .insert(missingNames.map((name) => ({ owner_id: ownerId, name })))
      .select('id, name')

    if (insertError) throw new Error(insertError.message)
    created = inserted ?? []
  }

  return [...(existing ?? []), ...created]
}

// デッキのタグをカンマ区切り文字列の内容で丸ごと置き換える。
// 存在しないタグ名は新規作成し、既存の紐付けは一度削除してから張り直す。
export async function syncDeckTags(
  deckId: string,
  ownerId: string,
  rawTags: string | null | undefined
) {
  const supabase = await createClient()
  const names = parseTagNames(rawTags)

  const { error: deleteError } = await supabase
    .from('deck_tags')
    .delete()
    .eq('deck_id', deckId)
  if (deleteError) throw new Error(deleteError.message)

  if (names.length === 0) return

  const tags = await upsertTags(ownerId, names)

  const { error: linkError } = await supabase
    .from('deck_tags')
    .insert(tags.map((tag) => ({ deck_id: deckId, tag_id: tag.id })))
  if (linkError) throw new Error(linkError.message)
}

// カードのタグをカンマ区切り文字列の内容で丸ごと置き換える(syncDeckTagsのカード版)
export async function syncCardTags(
  cardId: string,
  ownerId: string,
  rawTags: string | null | undefined
) {
  const supabase = await createClient()
  const names = parseTagNames(rawTags)

  const { error: deleteError } = await supabase.from('card_tags').delete().eq('card_id', cardId)
  if (deleteError) throw new Error(deleteError.message)

  if (names.length === 0) return

  const tags = await upsertTags(ownerId, names)

  const { error: linkError } = await supabase
    .from('card_tags')
    .insert(tags.map((tag) => ({ card_id: cardId, tag_id: tag.id })))
  if (linkError) throw new Error(linkError.message)
}

// 複数カード分のタグをまとめて取得する(一覧表示用)
// card_tagsテーブル未作成などで失敗しても、カード一覧全体をクラッシュさせないよう
// ここでは例外を投げず空オブジェクトにフォールバックする(呼び出し元はgetCards)。
//
// カードIDはCARD_TAGS_CHUNK_SIZE件ずつに分割して並列に問い合わせる。
// 1件のチャンクが失敗しても、他のチャンクの結果は活かしつつ処理を続行する
// (一覧全体が真っ白になるより、一部のカードのタグが欠けるだけの方が実害が小さいため)。
export async function getCardTagsByCardIds(cardIds: string[]): Promise<Record<string, Tag[]>> {
  if (cardIds.length === 0) return {}
  const supabase = await createClient()
  const chunks = chunkArray(cardIds, CARD_TAGS_CHUNK_SIZE)

  const chunkResults = await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await supabase
        .from('card_tags')
        .select('card_id, tags(id, name)')
        .in('card_id', chunk)

      if (error) {
        console.error('getCardTagsByCardIds failed:', error.message)
        return []
      }
      return (data ?? []) as unknown as { card_id: string; tags: Tag | Tag[] | null }[]
    })
  )

  const result: Record<string, Tag[]> = {}
  for (const row of chunkResults.flat()) {
    const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags
    if (!tag) continue
    if (!result[row.card_id]) result[row.card_id] = []
    result[row.card_id].push(tag)
  }
  return result
}

// タグそのものを削除する(参照している deck_tags も cascade で削除される)
export async function deleteTag(tagId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tags').delete().eq('id', tagId)
  if (error) return { error: error.message }

  revalidatePath('/decks')
  return { success: true }
}
