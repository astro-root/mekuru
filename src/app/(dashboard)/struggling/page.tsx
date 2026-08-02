import type { Metadata } from "next";
import { getStrugglingCards } from '@/lib/actions/reviews'
import { StrugglingCardList } from '@/components/struggling/struggling-card-list'

export const metadata: Metadata = {
  title: "苦手なカード",
}

export default async function StrugglingPage() {
  const cards = await getStrugglingCards(100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold">苦手なカード</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          間違えた回数が多い、またはFSRSの難易度が高いカードを、全デッキ横断で表示します。
        </p>
      </div>

      <StrugglingCardList cards={cards} />
    </div>
  )
}
