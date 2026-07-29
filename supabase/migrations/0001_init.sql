create extension if not exists "uuid-ossp";

create table decks (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  genre text,
  difficulty smallint default 1,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tags (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table deck_tags (
  deck_id uuid not null references decks(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (deck_id, tag_id)
);

create table cards (
  id uuid primary key default uuid_generate_v4(),
  deck_id uuid not null references decks(id) on delete cascade,
  front text not null,
  back text not null,
  cloze_text text,
  card_type text not null default 'basic',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table card_reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  due timestamptz not null default now(),
  stability real not null default 0,
  difficulty real not null default 0,
  elapsed_days real not null default 0,
  scheduled_days real not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  state smallint not null default 0,
  last_review timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, card_id)
);

alter table decks enable row level security;
alter table tags enable row level security;
alter table deck_tags enable row level security;
alter table cards enable row level security;
alter table card_reviews enable row level security;

create policy "decks_owner_all" on decks for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "decks_public_read" on decks for select using (is_public = true);
create policy "tags_owner_all" on tags for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "deck_tags_owner_all" on deck_tags for all using (
  exists (select 1 from decks where decks.id = deck_tags.deck_id and decks.owner_id = auth.uid())
);
create policy "cards_owner_all" on cards for all using (
  exists (select 1 from decks where decks.id = cards.deck_id and decks.owner_id = auth.uid())
) with check (
  exists (select 1 from decks where decks.id = cards.deck_id and decks.owner_id = auth.uid())
);
create policy "card_reviews_owner_all" on card_reviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());
