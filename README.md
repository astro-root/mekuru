This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## セットアップ

`.env.example` を `.env.local` にコピーし、値を埋めてください。

```bash
cp .env.example .env.local
```

| 変数 | 必須 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ○ | Supabaseプロジェクトの接続先 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ○ | クライアント/サーバー共通のanonキー |
| `SUPABASE_SERVICE_ROLE_KEY` | ○ | 学習リマインダーのcronジョブ専用。**絶対にクライアントへ公開しないこと** |
| `CRON_SECRET` | 任意 | `/api/cron/study-reminder` を保護するBearerトークン。未設定だとリマインダーは常に401を返します |
| `RESEND_API_KEY` | 任意 | [Resend](https://resend.com) のAPIキー。学習リマインダーメールの送信に使用 |
| `REMINDER_FROM_EMAIL` | 任意 | Resendで送信ドメイン認証済みの送信元アドレス |

学習リマインダー(`CRON_SECRET` / `RESEND_API_KEY` / `REMINDER_FROM_EMAIL`)は未設定でもアプリ自体は動作しますが、
`vercel.json` の cron(`/api/cron/study-reminder` を毎時実行)は動くため、本番運用する場合は必ず設定してください。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

