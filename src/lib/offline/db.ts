import Dexie, { type Table } from 'dexie'

export interface OfflineCard {
  id: string
  deckId: string
  front: string
  back: string
  cardType: string
  clozeText: string | null
  note: string | null
  position: number
  isFavorite: boolean
  isSuspended: boolean
  fsrsState: string // JSON化されたFSRS Card(due, stability, difficulty, etc.)
  updatedAt: string
}

export interface OfflineReviewQueueItem {
  id: string
  deckId: string
  cardId: string
  rating: string
  reviewedAt: string
  synced: number // 0 = 未同期, 1 = 同期済み
}

export interface OfflineDeckSetting {
  deckId: string
  newCardsPerDay: number | null // nullは上限なし
  updatedAt: string
}

class MekuruDB extends Dexie {
  cards!: Table<OfflineCard, string>
  reviewQueue!: Table<OfflineReviewQueueItem, string>
  deckSettings!: Table<OfflineDeckSetting, string>

  constructor() {
    super('mekuru')
    this.version(2).stores({
      cards: 'id, deckId, updatedAt',
      reviewQueue: 'id, deckId, cardId, synced, reviewedAt',
    })
    this.version(3).stores({
      cards: 'id, deckId, updatedAt',
      reviewQueue: 'id, deckId, cardId, synced, reviewedAt',
      deckSettings: 'deckId',
    })
  }
}

export const db = new MekuruDB()

// 共有端末でのログアウト後もカード内容・学習履歴がIndexedDBに残るのを防ぐため、
// ログアウト・アカウント削除時に必ず呼び出すこと。
export async function clearOfflineData() {
  await db.cards.clear()
  await db.reviewQueue.clear()
  await db.deckSettings.clear()
}
