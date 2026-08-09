# Root Account移行メモ（mekuru）

## QuizNaviとの違い

QuizNaviはPrismaが`authId`という緩い参照(外部キー制約なし)でSupabase Authを参照していたため、
接続先を差し替えるだけで済んだ。**mekuruは`decks.owner_id`などが`auth.users(id)`に直接外部キー
制約で紐づいているため、単純な差し替えができない。**

そのため、Root Account基盤(共有Supabaseプロジェクト)側に`mekuru`という専用スキーマを作り、
mekuruの全テーブルをそこに移設する方式にした。専用スキーマにした理由は、QuizNaviが既に
`public.tags`というテーブルを持っており、mekuruの`tags`テーブルと名前が衝突するため。

## コードの変更点

- `src/lib/supabase/client.ts` / `server.ts` / `src/proxy.ts` / `src/lib/supabase/admin.ts`：
  接続先を`NEXT_PUBLIC_ROOT_ACCOUNT_URL`に変更し、`db: { schema: 'mekuru' }`を指定。
  cookieのdomainも`.astro-root.com`に設定(サブドメイン間SSOのため)
- `src/lib/root-account/entitlements.ts`：新規追加。QuizNavi側と同一内容

## 手動で必要な作業（コードの外）

### 1. スキーマ作成

`root-account`リポジトリの`supabase/migrations/0003_mekuru_schema.sql`を、共有Supabase
プロジェクトのSQL Editorで実行する。

### 2. Exposed schemasの設定（これを忘れるとAPI経由でmekuruスキーマに触れない）

Supabaseダッシュボード → Project Settings → API → **Exposed schemas** に `mekuru` を追加する。
デフォルトは`public, graphql_public`のみが公開されているため、これをやらないと
`supabase-js`から`mekuru`スキーマのテーブルにアクセスしようとした際にエラーになる。

### 3. デプロイ先ドメインを`*.astro-root.com`のサブドメインにする

QuizNaviの時と同様、cookie共有(`.astro-root.com`)が機能するために必須。

### 4. 既存データ(5ユーザー分)の移行

**このステップだけは、私(Claude)の方では実行できない。** ネットワークアクセスがなく、
実際のSupabaseプロジェクトに接続できないため、以下の手順を実際に手元で実行する必要がある。

#### 手順概要

Supabase AuthはプロジェクトごとにユーザーIDが独立して発行されるため、旧mekuruプロジェクトの
`auth.users.id`と、新しいRoot Accountプロジェクトの`auth.users.id`は**同じメールアドレスでも
別の値になる**。したがって、単純にテーブルをコピーするだけでは`owner_id`/`user_id`が
指す先が存在しないIDになってしまう。「旧ID→新ID」の対応表を作り、データ移行時に
IDを付け替える必要がある。

**ステップ1: 新プロジェクトに5人のユーザーを先に作る**

以下のいずれかの方法で、5人のメールアドレスをRoot Accountプロジェクトの`auth.users`に登録する。

- 一番簡単なのは、5人に「新しいログイン画面からパスワード再設定 or 新規登録をしてください」と
  連絡し、実際にログインしてもらう方法(あなたが「こちらから連絡すればいい」と言っていたのは
  ここで活きる)
- または、Supabase管理画面の Authentication > Users から Admin権限で直接ユーザーを作成する

**ステップ2: 新旧のメールアドレス→IDの対応表を作る**

新プロジェクトのSQL Editorで、一時的なマッピングテーブルを作る。

```sql
create table if not exists mekuru._migration_user_map (
  old_user_id uuid primary key,
  new_user_id uuid not null,
  email text not null
);
```

旧プロジェクトの`auth.users`から`id, email`の一覧をエクスポート(SQL Editorで
`select id, email from auth.users;`を実行して結果をコピー)し、新プロジェクトの
`auth.users`から同様に`id, email`を取得して、emailをキーに手動で(5人だけなので)
`insert into mekuru._migration_user_map values (...);`を組み立てて実行する。

**ステップ3: 旧プロジェクトからデータをエクスポートする**

旧mekuruプロジェクトのSQL Editorで、以下のようにテーブルごとにJSON/CSV出力するか、
`pg_dump`が使える環境があれば以下を実行する(Supabase接続文字列は
Project Settings > Database から取得できる)。

```bash
pg_dump "postgresql://postgres:[旧プロジェクトのパスワード]@[旧プロジェクトのホスト]:5432/postgres" \
  --data-only --column-inserts \
  -t public.decks -t public.tags -t public.deck_tags -t public.cards \
  -t public.card_tags -t public.card_reviews -t public.review_logs \
  -t public.reminder_settings \
  > mekuru_data_dump.sql
```

**ステップ4: 新プロジェクトへ、スキーマとowner_id/user_idを付け替えながら投入する**

エクスポートした`mekuru_data_dump.sql`は`public.decks`のような形でINSERT文が並んでいるので、
実行前に以下の一括置換をしておく。

- `public.decks` → `mekuru.decks`（他のテーブルも同様に`public.` → `mekuru.`）

そのままでは`owner_id`/`user_id`が旧IDのままなので、新プロジェクトのSQL Editorで
**まず旧IDのまま`mekuru`スキーマの各テーブルに投入したあと**、以下のように
マッピングテーブルを使って一括更新する。

```sql
update mekuru.decks d
set owner_id = m.new_user_id
from mekuru._migration_user_map m
where d.owner_id = m.old_user_id;

update mekuru.tags t
set owner_id = m.new_user_id
from mekuru._migration_user_map m
where t.owner_id = m.old_user_id;

update mekuru.card_reviews c
set user_id = m.new_user_id
from mekuru._migration_user_map m
where c.user_id = m.old_user_id;

update mekuru.review_logs r
set user_id = m.new_user_id
from mekuru._migration_user_map m
where r.user_id = m.old_user_id;

update mekuru.reminder_settings s
set user_id = m.new_user_id
from mekuru._migration_user_map m
where s.user_id = m.old_user_id;
```

**ステップ5: 動作確認後、マッピングテーブルを削除**

```sql
drop table mekuru._migration_user_map;
```

#### 注意点

- 外部キー制約があるため、投入順序は `decks/tags` → `deck_tags` → `cards` → `card_tags/card_reviews` →
  `review_logs` の順を守ること(親テーブルが先)
- `contact_messages`はユーザーに紐付かないデータなので、そのまま`mekuru.contact_messages`に
  コピーするだけでよい(ID付け替え不要)
- 作業前に、旧プロジェクト側でバックアップ(Supabaseダッシュボードの Database > Backups)を
  取っておくことを強く推奨する

## 未着手（今回のスコープ外）

- `requirePlan()`相当のプラン判定を、保存容量制限やAI機能などmekuru固有の機能に組み込む作業
- 旧mekuruプロジェクト自体の削除(データ移行・動作確認が完全に終わってから)
