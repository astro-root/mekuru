import type { Metadata } from "next";
import { getPublicDecks } from '@/lib/actions/decks'
import { ExploreList } from '@/components/deck/explore-list'

export const metadata: Metadata = {
  title: "みんなのデッキ",
}

export default async function ExplorePage() {
  const decks = await getPublicDecks()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold">みんなのデッキ</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          他のユーザーが公開しているデッキを探して、自分のデッキとして複製できます。
        </p>
      </div>
      <ExploreList decks={decks} />
    </div>
  )
}
