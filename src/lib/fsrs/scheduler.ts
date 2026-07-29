import { fsrs, generatorParameters, Rating, State, createEmptyCard, type Card, type RecordLogItem } from 'ts-fsrs'

const params = generatorParameters({ enable_fuzz: true, maximum_interval: 36500 })
const scheduler = fsrs(params)

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'

const ratingMap: Record<ReviewRating, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

export function createNewFsrsCard(): Card {
  return createEmptyCard()
}

export function scheduleReview(card: Card, rating: ReviewRating, now: Date = new Date()): RecordLogItem {
  const schedulingCards = scheduler.repeat(card, now)
  return schedulingCards[ratingMap[rating]]
}

export function isDue(card: Card, now: Date = new Date()): boolean {
  return card.state === State.New || new Date(card.due) <= now
}
