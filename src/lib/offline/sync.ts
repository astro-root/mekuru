import { db, type OfflineCard } from './db'
import { createEmptyCard, State, type Card } from 'ts-fsrs'
import { scheduleReview, isDue, type ReviewRating } from '@/lib/fsrs/scheduler'
import { submitReview, undoReview, getDeckCardsWithState, type CardWithState, type FsrsSnapshot } from '@/lib/actions/reviews'
import { getDeckNewCardsLimit } from '@/lib/actions/decks'

export function parseFsrsState(json: string): Card {
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
    position: c.position,
    fsrsState: stringifyFsrsCard(c.fsrsCard),
    updatedAt: now,
  }))

  await db.transaction('rw', db.cards, async () => {
    await db.cards.where({ deckId }).delete()
    await db.cards.bulkAdd(offlineCards)
  })

  // 新規カード数上限も合わせてキャッシュする。取得に失敗してもカード本体の
  // キャッシュ更新は既に完了しているので、ここは握りつぶして既存設定を残す。
  try {
    const newCardsPerDay = await getDeckNewCardsLimit(deckId)
    await db.deckSettings.put({ deckId, newCardsPerDay, updatedAt: now })
  } catch {
    // 何もしない(前回キャッシュした上限をそのまま使う)
  }
}

/** キャッシュ済みの新規カード数上限を取得する。未取得の場合はnull(上限なし扱い)を返す */
export async function getCachedNewCardsLimit(deckId: string): Promise<number | null> {
  const setting = await db.deckSettings.get(deckId)
  return setting ? setting.newCardsPerDay : null
}

export type OfflineDueCard = {
  id: string
  front: string
  back: string
  cardType: string
  clozeText: string | null
  note: string | null
  position: number
  fsrsState: string
}

/**
 * 出題対象カードを取得する。未学習(state === New)カードは新規カード数上限を適用し、
 * 復習期限を迎えたカード(state !== New)は上限の対象外(通常通り全件出題)とする。
 * 上限がnull(未設定)の場合は従来通り無制限。
 */
export async function getCachedDueCards(deckId: string): Promise<OfflineDueCard[]> {
  const cards = await db.cards.where({ deckId }).toArray()
  const now = new Date()
  const newCardsPerDay = await getCachedNewCardsLimit(deckId)

  const due = cards
    .filter((c) => isDue(parseFsrsState(c.fsrsState), now))
    .sort((a, b) => a.position - b.position) // 既定は登録順(position昇順)

  const reviewCards = due.filter((c) => parseFsrsState(c.fsrsState).state !== State.New)
  let newCards = due.filter((c) => parseFsrsState(c.fsrsState).state === State.New)
  if (newCardsPerDay !== null) {
    newCards = newCards.slice(0, newCardsPerDay)
  }

  return [...reviewCards, ...newCards]
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      cardType: c.cardType,
      clozeText: c.clozeText,
      note: c.note,
      position: c.position,
      fsrsState: c.fsrsState,
    }))
}

export type AppliedReview = {
  reviewQueueId: string
  previousFsrsState: string | null
}

export async function applyReviewOffline(
  deckId: string,
  cardId: string,
  rating: ReviewRating
): Promise<AppliedReview> {
  const existing = await db.cards.get(cardId)
  const previousFsrsState = existing ? existing.fsrsState : null
  const currentFsrsCard = existing ? parseFsrsState(existing.fsrsState) : createEmptyCard()
  const result = scheduleReview(currentFsrsCard, rating)

  if (existing) {
    await db.cards.update(cardId, {
      fsrsState: stringifyFsrsCard(result.card),
      updatedAt: new Date().toISOString(),
    })
  }

  const reviewQueueId = crypto.randomUUID()
  await db.reviewQueue.add({
    id: reviewQueueId,
    deckId,
    cardId,
    rating,
    reviewedAt: new Date().toISOString(),
    synced: 0,
  })

  // オンラインならすぐに同期を試みる(失敗しても未同期のまま残るだけなので問題ない)
  syncPendingReviews(deckId).catch(() => {})

  return { reviewQueueId, previousFsrsState }
}

function cardToSnapshot(card: Card): NonNullable<FsrsSnapshot> {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : null,
    learning_steps: card.learning_steps ?? 0,
  }
}

/**
 * 直前の評価を取り消す。
 * - まだサーバーへ未送信ならキューから削除するだけでよい
 * - 既にサーバーへ送信済みならサーバー側のFSRS状態・復習ログも合わせて戻す
 */
export async function undoLastReviewOffline(
  deckId: string,
  cardId: string,
  applied: AppliedReview
): Promise<{ error?: string }> {
  const { reviewQueueId, previousFsrsState } = applied
  const item = await db.reviewQueue.get(reviewQueueId)

  if (previousFsrsState) {
    await db.cards.update(cardId, { fsrsState: previousFsrsState, updatedAt: new Date().toISOString() })
  } else {
    // 元々未学習だったカードなので、ローカルキャッシュからも復習状態を消す
    await db.cards.update(cardId, { fsrsState: stringifyFsrsCard(createEmptyCard()), updatedAt: new Date().toISOString() })
  }

  if (!item || item.synced === 0) {
    if (item) await db.reviewQueue.delete(reviewQueueId)
    return {}
  }

  // 既にサーバーへ送信済みの場合は、サーバー側のcard_reviews/review_logsも戻す
  const snapshot = previousFsrsState ? cardToSnapshot(parseFsrsState(previousFsrsState)) : null
  try {
    const result = await undoReview(deckId, cardId, reviewQueueId, snapshot)
    if (result?.error) return { error: result.error }
  } catch {
    return { error: 'オフラインのため、サーバー側の取り消しは接続復帰後に反映されます' }
  }
  await db.reviewQueue.delete(reviewQueueId)
  return {}
}

export async function getCachedCardsByIds(
  deckId: string,
  ids: string[]
): Promise<OfflineDueCard[]> {
  const allCards = await db.cards.where({ deckId }).toArray()
  const byId = new Map(allCards.map((c) => [c.id, c]))
  const result: OfflineDueCard[] = []

  for (const id of ids) {
    const c = byId.get(id)
    if (!c) continue // カードが削除された等、稀なケースはスキップする
    result.push({
      id: c.id,
      front: c.front,
      back: c.back,
      cardType: c.cardType,
      clozeText: c.clozeText,
      note: c.note,
      position: c.position,
      fsrsState: c.fsrsState,
    })
  }

  return result
}

export type SyncSummary = {
  syncedCount: number
  discardedCount: number
  remainingCount: number
}

/**
 * 未同期の評価をサーバーへ送信する。
 * - 通信断など「一時的エラー」: そこで中断し、残りは次回の同期に持ち越す(順序を守るため)
 * - 対象カードが既に削除済みなど「恒久的エラー」: そのカードの評価だけキューから除外し、
 *   後続カードの評価の同期がブロックされ続けないようにする
 */
export async function syncPendingReviews(deckId: string): Promise<SyncSummary> {
  const summary: SyncSummary = { syncedCount: 0, discardedCount: 0, remainingCount: 0 }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return summary

  const pending = await db.reviewQueue
    .where({ deckId, synced: 0 })
    .sortBy('reviewedAt')

  for (const item of pending) {
    try {
      const result = await submitReview(item.deckId, item.cardId, item.rating as ReviewRating, item.reviewedAt, item.id)
      if (result?.error) {
        if ('permanent' in result && result.permanent) {
          // リトライしても解決しないエラーなので、このカードの評価だけ諦めて次へ進む
          await db.reviewQueue.update(item.id, { synced: 1 })
          summary.discardedCount++
          continue
        }
        break // サーバー側エラー(一時的)。同じカードの後続評価の順序を守るため中断
      }
      await db.reviewQueue.update(item.id, { synced: 1 })
      summary.syncedCount++
    } catch {
      break // オフラインに戻った等。残りは次回の同期に持ち越す
    }
  }

  summary.remainingCount = await db.reviewQueue.where({ deckId, synced: 0 }).count()
  await pruneSyncedReviewQueue(deckId)
  return summary
}

/** 同期済みで一定期間経過したキュー項目を削除し、IndexedDBの肥大化を防ぐ */
export async function pruneSyncedReviewQueue(deckId: string, olderThanMs = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  const threshold = new Date(Date.now() - olderThanMs).toISOString()
  const staleSynced = await db.reviewQueue.where({ deckId, synced: 1 }).toArray()
  const idsToDelete = staleSynced.filter((item) => item.reviewedAt < threshold).map((item) => item.id)
  if (idsToDelete.length > 0) {
    await db.reviewQueue.bulkDelete(idsToDelete)
  }
}

/** UI表示用: 現在キューに残っている未同期の評価件数 */
export async function getPendingReviewCount(deckId: string): Promise<number> {
  return db.reviewQueue.where({ deckId, synced: 0 }).count()
}

function formatIntervalLabel(days: number): string {
  if (days < 1) return '1日以内'
  if (days < 30) return `${Math.round(days)}日後`
  if (days < 365) return `${Math.round(days / 30)}ヶ月後`
  return `${Math.round(days / 365)}年後`
}

/** 「わからなかった」「わかった」それぞれを選んだ場合、次回いつ復習になるかを事前計算する */
export function getIntervalPreview(fsrsStateJson: string): Record<ReviewRating, string> {
  const now = new Date()
  const currentCard = parseFsrsState(fsrsStateJson)

  const preview = {} as Record<ReviewRating, string>
  for (const r of ['again', 'good'] as ReviewRating[]) {
    const result = scheduleReview(currentCard, r, now)
    const days = (result.card.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    preview[r] = formatIntervalLabel(days)
  }
  return preview
}
