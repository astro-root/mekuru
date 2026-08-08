import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: "更新履歴",
}

export default function ChangelogPage() {
  return (
    <LegalPageLayout title="更新履歴" updatedAt="2026年8月8日">
      <p className="text-muted-foreground">
        「めくる」の主な機能追加・改善の履歴です。障害情報についても、発生時はここに追記します。
      </p>

      <LegalSection heading="2026年8月">
        <ul>
          <li>デッキごとに試験日を設定し、残り日数から1日あたりの推奨学習ペースを表示できるようにしました。</li>
          <li>デッキを公開し、他のユーザーが「みんなのデッキ」から複製できる機能を追加しました。</li>
          <li>デッキ一覧に連続学習記録(ストリーク)を表示するようにしました。</li>
          <li>早押し表示・通知・苦手カード分析など、既存機能の説明をトップページに追加しました。</li>
          <li>OS側の「視差効果を減らす」設定に対応し、アニメーションを抑制できるようにしました。</li>
        </ul>
      </LegalSection>

      <LegalSection heading="2026年7月以前">
        <p>
          間隔反復(FSRS)による復習機能、オフライン対応、CSV/Excelのインポート・エクスポート、
          穴埋め(cloze)形式のカード作成など、サービスの基本機能をリリースしました。
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
