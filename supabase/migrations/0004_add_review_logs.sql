create table review_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  deck_id uuid not null references decks(id) on delete cascade,
  rating text not null,
  reviewed_at timestamptz not null default now()
);

create index review_logs_user_reviewed_at_idx on review_logs (user_id, reviewed_at desc);

alter table review_logs enable row level security;

create policy "review_logs_owner_all" on review_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
