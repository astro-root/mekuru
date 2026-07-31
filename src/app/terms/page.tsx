import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: "利用規約",
}

export default function TermsPage() {
  return (
    <LegalPageLayout title="利用規約" updatedAt="2026年7月31日">
      <p className="text-muted-foreground">
        この利用規約(以下「本規約」といいます)は、「めくる」(以下「本サービス」といいます)の利用条件を定めるものです。
        利用者は、本サービスを利用することにより、本規約に同意したものとみなされます。
      </p>

      <LegalSection heading="第1条(適用)">
        <p>
          本規約は、本サービスの利用に関わる一切の関係に適用されます。本サービス内で個別に案内される利用条件がある場合、
          当該条件が本規約に優先して適用されます。
        </p>
      </LegalSection>

      <LegalSection heading="第2条(アカウント登録)">
        <ul>
          <li>利用者は、真実かつ正確な情報を用いてアカウントを登録するものとします。</li>
          <li>アカウントに関するID・パスワードの管理責任は利用者本人が負うものとします。</li>
          <li>第三者による不正利用が判明した場合、利用者は速やかに運営者へ連絡するものとします。</li>
        </ul>
      </LegalSection>

      <LegalSection heading="第3条(禁止事項)">
        <p>利用者は、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
        <ul>
          <li>法令または公序良俗に違反する行為</li>
          <li>他の利用者または第三者の権利・利益を侵害する行為</li>
          <li>本サービスのサーバーやネットワークに過度な負荷をかける行為、または不正アクセスを試みる行為</li>
          <li>本サービスの運営を妨げる行為</li>
          <li>本サービスを通じて著作権等の第三者の権利を侵害するコンテンツを登録する行為</li>
          <li>その他、運営者が不適切と判断する行為</li>
        </ul>
      </LegalSection>

      <LegalSection heading="第4条(ユーザーコンテンツの取り扱い)">
        <p>
          利用者が作成したデッキ・カード等のコンテンツ(以下「ユーザーコンテンツ」といいます)の著作権その他の権利は、
          利用者に帰属します。運営者は、復習機能の提供、インポート/エクスポート機能の提供、バックアップなど、
          本サービスの提供に必要な範囲でユーザーコンテンツを利用できるものとします。
        </p>
      </LegalSection>

      <LegalSection heading="第5条(インポート機能に関する注意)">
        <p>
          利用者がCSVやExcelファイルをインポートする際は、当該ファイルの内容について適法な利用権限を有していることを
          利用者自身の責任で確認するものとします。第三者の著作物等を権限なくインポートしたことにより生じた問題について、
          運営者は責任を負いません。
        </p>
      </LegalSection>

      <LegalSection heading="第6条(サービスの停止・変更・終了)">
        <p>
          運営者は、システムの保守、天災、その他やむを得ない事由がある場合、利用者への事前の通知なく本サービスの全部
          または一部の提供を停止または中断できるものとします。また、運営者の判断により、本サービスの内容を変更し、
          または提供を終了することがあります。
        </p>
      </LegalSection>

      <LegalSection heading="第7条(免責事項)">
        <ul>
          <li>
            本サービスは、間隔反復アルゴリズム(FSRS)に基づき復習タイミングを提示しますが、学習成果を保証するものではありません。
          </li>
          <li>
            オフライン機能利用時、端末や通信環境の状況によりデータの同期に遅延・不整合が生じる場合があります。
          </li>
          <li>
            運営者は、本サービスに起因して利用者に生じた損害について、運営者に故意または重過失がある場合を除き、責任を負いません。
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="第8条(利用停止・登録抹消)">
        <p>
          運営者は、利用者が本規約に違反したと判断した場合、事前の通知なく当該利用者のアカウントの利用を停止し、
          または登録を抹消できるものとします。
        </p>
      </LegalSection>

      <LegalSection heading="第9条(本規約の変更)">
        <p>
          運営者は、必要と判断した場合、利用者への周知のうえ本規約を変更できるものとします。変更後の本規約は、
          本サービス上に掲載した時点から効力を生じるものとします。
        </p>
      </LegalSection>

      <LegalSection heading="第10条(準拠法・管轄裁判所)">
        <p>
          本規約の解釈にあたっては日本法を準拠法とします。本サービスに関して紛争が生じた場合には、運営者の所在地を
          管轄する裁判所を第一審の専属的合意管轄裁判所とします。
        </p>
      </LegalSection>

      <LegalSection heading="第11条(お問い合わせ窓口)">
        <p className="font-mono text-xs">お問い合わせ先: support@example.com(実際の運用時にご自身の連絡先へ差し替えてください)</p>
      </LegalSection>

      <p className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-xs text-muted-foreground">
        本ページは一般的なひな形として作成したサンプルであり、法的助言ではありません。実際のサービス運用にあたっては、
        事業内容や取扱いデータに応じて、弁護士等の専門家にご確認のうえ内容を調整してください。
      </p>
    </LegalPageLayout>
  )
}
