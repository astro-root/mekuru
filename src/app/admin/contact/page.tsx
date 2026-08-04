import type { Metadata } from "next";
import { getContactMessages } from '@/lib/actions/admin'
import { ContactMessageList } from '@/components/admin/contact-message-list'

export const metadata: Metadata = {
  title: "お問い合わせ管理",
}

export default async function AdminContactPage() {
  const result = await getContactMessages()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-heading text-xl font-bold">お問い合わせ管理</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        フォームから送信されたお問い合わせの一覧です。
      </p>

      <div className="mt-6">
        {result.error ? (
          <p className="text-sm text-destructive">{result.error}</p>
        ) : (
          <ContactMessageList messages={result.data ?? []} />
        )}
      </div>
    </div>
  )
}
