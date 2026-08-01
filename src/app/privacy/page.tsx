import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: "プライバシーポリシー",
}

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="プライバシーポリシー" updatedAt="2026年7月31日">
      <p className="text-muted-foreground">
        「めくる」(以下「本サービス」といいます)は、利用者の個人情報を適切に保護することを重要な責務と考え、
        以下のとおりプライバシーポリシー(以下「本ポリシー」といいます)を定めます。
      </p>

      <LegalSection heading="第1条(取得する情報)">
        <p>本サービスは、利用者から以下の情報を取得します。</p>
        <ul>
          <li>メールアドレスおよびパスワード(メールアドレスでの登録時)</li>
          <li>氏名・メールアドレス・プロフィール画像などの認証情報(Googleアカウントでログインした場合)</li>
          <li>作成したデッキ・カードの内容、学習(復習)履歴、評価(わからなかった/わかった)の記録</li>
          <li>オフライン利用のため、お使いの端末のブラウザ内(IndexedDB)に一時的に保存される学習データ</li>
          <li>アクセスログ、Cookie、端末情報などの技術的情報</li>
        </ul>
      </LegalSection>

      <LegalSection heading="第2条(利用目的)">
        <p>取得した情報は、以下の目的の範囲内で利用します。</p>
        <ul>
          <li>本サービスのアカウント認証、ログイン状態の維持のため</li>
          <li>間隔反復アルゴリズム(FSRS)による復習スケジュールの計算・提示のため</li>
          <li>学習履歴・連続学習日数などの統計情報を利用者に表示するため</li>
          <li>お問い合わせへの対応、重要なお知らせの送付のため</li>
          <li>不正利用の防止、サービスの維持・改善のため</li>
        </ul>
      </LegalSection>

      <LegalSection heading="第3条(第三者への提供・委託)">
        <p>
          本サービスは、認証基盤・データベースとして Supabase を、Googleアカウントでのログイン機能として
          Google の認証サービスを利用しています。これらのサービス提供事業者には、サービス提供に必要な範囲で
          情報を取り扱わせていますが、法令に基づく場合を除き、本人の同意なく第三者に個人情報を提供することはありません。
        </p>
      </LegalSection>

      <LegalSection heading="第4条(Cookie等の利用)">
        <p>
          本サービスは、ログイン状態の維持や利用状況の把握のためにCookieおよび類似の技術を利用することがあります。
          また、オフラインでも復習を継続できるよう、ブラウザのローカルストレージ(IndexedDB)にカード情報や
          未送信の学習結果を一時的に保存します。これらのデータは、通信が回復した際にサーバーへ同期されます。
        </p>
      </LegalSection>

      <LegalSection heading="第5条(安全管理措置)">
        <p>
          本サービスは、取得した個人情報の漏えい、滅失またはき損の防止その他個人情報の安全管理のために、
          必要かつ適切な措置を講じます。
        </p>
      </LegalSection>

      <LegalSection heading="第6条(利用者の権利)">
        <p>
          利用者は、本サービスが保有する自己の個人情報について、開示、訂正、追加、削除、利用停止を求めることができます。
          ご希望の場合は、下記のお問い合わせ先までご連絡ください。アカウントを削除した場合、作成したデッキ・カードおよび
          学習履歴は速やかに削除されます。
        </p>
      </LegalSection>

      <LegalSection heading="第7条(未成年者の利用)">
        <p>
          未成年者が本サービスを利用する場合は、あらかじめ保護者等の同意を得たうえでご利用ください。
        </p>
      </LegalSection>

      <LegalSection heading="第8条(本ポリシーの変更)">
        <p>
          本サービスは、法令の変更やサービス内容の変更等に応じて、本ポリシーを変更することがあります。
          変更後の内容は、本ページに掲載した時点から効力を生じるものとします。
        </p>
      </LegalSection>

      <LegalSection heading="第9条(お問い合わせ窓口)">
        <p>本ポリシーに関するお問い合わせは、以下の窓口までご連絡ください。</p>
        <p className="font-mono text-xs">お問い合わせ先: support@example.com(実際の運用時にご自身の連絡先へ差し替えてください)</p>
      </LegalSection>

      <p className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-xs text-muted-foreground">
        本ページは一般的なひな形として作成したサンプルであり、法的助言ではありません。実際のサービス運用にあたっては、
        取り扱うデータの内容や事業形態に応じて、弁護士等の専門家にご確認のうえ内容を調整してください。
      </p>
    </LegalPageLayout>
  )
}
