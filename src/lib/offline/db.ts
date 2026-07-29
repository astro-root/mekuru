import Dexie, { type Table } from 'dexie'

export interface OfflineCard {
  id: string
  deckId: string
  front: string
  back: string
  cloze: string | null
  tags: string[]
  fsrsState: string
  dirty: number
  updatedAt: string
}

export interface OfflineReviewQueueItem {
  id: string
  cardId: string
  rating: string
  reviewedAt: string
  synced: number
}

class MekuruDB extends Dexie {
  cards!: Table<OfflineCard, string>
  reviewQueue!: Table<OfflineReviewQueueItem, string>

  constructor() {
    super('mekuru')
    this.version(1).stores({
      cards: 'id, deckId, dirty, updatedAt',
      reviewQueue: 'id, cardId, synced',
    })
  }
}

export const db = new MekuruDB()
