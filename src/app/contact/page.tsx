import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: "お問い合わせ",
}

export default function ContactPage() {
  return (
    <LegalPageLayout title="お問い合わせ" updatedAt="2026年8月1日">
      <p className="text-muted-foreground">
        「めくる」に関するお問い合わせ・不具合報告・データに関するご相談は、以下の窓口までご連絡ください。
        通常、2〜3営業日以内にご返信します。
      </p>

      <LegalSection heading="運営者情報">
        <p className="font-mono text-xs">
          運営者: るーと<br />
          お問い合わせ先: contact@astro-root.com
        </p>
      </LegalSection>

      <LegalSection heading="よくあるお問い合わせ">
        <ul>
          <li>アカウントやデータに関するご相談(アカウント削除・データ移行など)</li>
          <li>インポート/エクスポートがうまくいかない場合の不具合報告</li>
          <li>個人情報の開示・訂正・削除等のご請求</li>
          <li>その他、本サービスに関するご意見・ご要望</li>
        </ul>
      </LegalSection>

      <LegalSection heading="ご連絡いただく際のお願い">
        <ul>
          <li>登録に使用しているメールアドレスをご記載ください。</li>
          <li>不具合報告の場合は、発生した操作手順と、可能であればスクリーンショットをご添付ください。</li>
          <li>お問い合わせ内容によっては、確認のため追加の情報をお伺いする場合があります。</li>
        </ul>
      </LegalSection>
    </LegalPageLayout>
  )
}
