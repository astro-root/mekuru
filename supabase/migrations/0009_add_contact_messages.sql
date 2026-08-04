create table if not exists contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied')),
  created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;

-- フォーム送信は未ログインの訪問者からも行われるため、insertのみanon/authenticatedに開放する。
-- select/update/deleteのポリシーは意図的に用意しない(=誰も直接読めない)。
-- 管理画面はservice_role(admin client)経由でRLSを迂回して読む。
create policy "contact_messages_insert_public" on contact_messages
  for insert
  to anon, authenticated
  with check (true);
