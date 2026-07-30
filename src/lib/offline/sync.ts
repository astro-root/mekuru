import { db, type OfflineCard } from './db'
import { createEmptyCard, type Card } from 'ts-fsrs'
import { scheduleReview, isDue, type ReviewRating } from '@/lib/fsrs/scheduler'
import { submitReview, getDeckCardsWithState, type CardWithState } from '@/lib/actions/reviews'

function parseFsrsState(json: string): Card {
  const raw = JSON.parse(json)
  return {
    ...raw,
    due: new Date(raw.due),
    last_review: raw.last_review ? new Date(raw.last_review) : undefined,
  }
}

function stringifyFsrsCard(card: Card): string {
  return JSON.stringify(card)
}

export async function hasPendingReviews(deckId: string): Promise<boolean> {
  const count = await db.reviewQueue.where({ deckId, synced: 0 }).count()
  return count > 0
}

export async function hydrateDeckCache(deckId: string): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  // 未同期の評価が残っている間は、サーバーの状態でキャッシュを上書きしない
  if (await hasPendingReviews(deckId)) return

  let cards: CardWithState[]
  try {
    cards = await getDeckCardsWithState(deckId)
  } catch {
    return // オフラインまたはサーバーエラー時はキャッシュをそのまま使う
  }

  const now = new Date().toISOString()
  const offlineCards: OfflineCard[] = cards.map((c) => ({
    id: c.id,
    deckId,
    front: c.front,
    back: c.back,
    cardType: c.card_type,
    clozeText: c.cloze_text,
    note: c.note,
    fsrsState: stringifyFsrsCard(c.fsrsCard),
    updatedAt: now,
  }))

  await db.transaction('rw', db.cards, async () => {
    await db.cards.where({ deckId }).delete()
    await db.cards.bulkAdd(offlineCards)
  })
}

export type OfflineDueCard = {
  id: string
  front: string
  back: string
  cardType: string
  clozeText: string | null
  note: string | null
}

export async function getCachedDueCards(deckId: string): Promise<OfflineDueCard[]> {
  const cards = await db.cards.where({ deckId }).toArray()
  const now = new Date()

  return cards
    .filter((c) => isDue(parseFsrsState(c.fsrsState), now))
    .map((c) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      cardType: c.cardType,
      clozeText: c.clozeText,
      note: c.note,
    }))
}

export async function applyReviewOffline(
  deckId: string,
  cardId: string,
  rating: ReviewRating
): Promise<void> {
  const existing = await db.cards.get(cardId)
  const currentFsrsCard = existing ? parseFsrsState(existing.fsrsState) : createEmptyCard()
  const result = scheduleReview(currentFsrsCard, rating)

  if (existing) {
    await db.cards.update(cardId, {
      fsrsState: stringifyFsrsCard(result.card),
      updatedAt: new Date().toISOString(),
    })
  }

  await db.reviewQueue.add({
    id: crypto.randomUUID(),
    deckId,
    cardId,
    rating,
    reviewedAt: new Date().toISOString(),
    synced: 0,
  })

  // オンラインならすぐに同期を試みる(失敗しても未同期のまま残るだけなので問題ない)
  syncPendingReviews(deckId).catch(() => {})
}

export async function syncPendingReviews(deckId: string): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  const pending = await db.reviewQueue
    .where({ deckId, synced: 0 })
    .sortBy('reviewedAt')

  for (const item of pending) {
    try {
      const result = await submitReview(item.deckId, item.cardId, item.rating as ReviewRating)
      if (result?.error) break // サーバー側エラー。同じカードの後続評価の順序を守るため中断
      await db.reviewQueue.update(item.id, { synced: 1 })
    } catch {
      break // オフラインに戻った等。残りは次回の同期に持ち越す
    }
  }
}
