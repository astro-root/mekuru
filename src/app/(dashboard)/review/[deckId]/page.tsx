import type { Metadata } from "next";
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDeck } from '@/lib/actions/decks'
import { ReviewSession } from '@/components/review/review-session'
import { ArrowLeft } from 'lucide-react'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ deckId: string }>
}): Promise<Metadata> {
  const { deckId } = await params
  try {
    const deck = await getDeck(deckId)
    return { title: `復習 - ${deck?.name ?? ""}` }
  } catch {
    return { title: "復習" }
  }
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
  const { deckId } = await params

  let deck
  try {
    deck = await getDeck(deckId)
  } catch {
    notFound()
  }
  if (!deck) notFound()

  return (
    <div className="space-y-6">
      <Link
        href={`/decks/${deckId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        {deck.name} に戻る
      </Link>
      <h1 className="font-heading text-xl font-bold">{deck.name} — 復習</h1>
      <ReviewSession deckId={deckId} />
    </div>
  )
}
