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

class MekuruDB extends Dexie {
  cards!: Table<OfflineCard, string>
  reviewQueue!: Table<OfflineReviewQueueItem, string>

  constructor() {
    super('mekuru')
    this.version(2).stores({
      cards: 'id, deckId, updatedAt',
      reviewQueue: 'id, deckId, cardId, synced, reviewedAt',
    })
  }
}

export const db = new MekuruDB()
