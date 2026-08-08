-- デッキごとに「試験日」を設定し、残り日数から逆算した1日あたりの推奨学習ペースを
-- 算出するための機能。デッキに対して1件のみ設定できるシンプルな構成とする。
create table exam_goals (
  id uuid primary key default uuid_generate_v4(),
  deck_id uuid not null references decks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  exam_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deck_id, owner_id)
);

alter table exam_goals enable row level security;

create policy "exam_goals_owner_all" on exam_goals for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
