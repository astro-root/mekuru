create table if not exists card_tags (
  card_id uuid not null references cards(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (card_id, tag_id)
);

alter table card_tags enable row level security;

create index if not exists card_tags_tag_id_idx on card_tags (tag_id);

create policy "card_tags_owner_all" on card_tags for all using (
  exists (
    select 1 from cards
    join decks on decks.id = cards.deck_id
    where cards.id = card_tags.card_id and decks.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1 from cards
    join decks on decks.id = cards.deck_id
    where cards.id = card_tags.card_id and decks.owner_id = auth.uid()
  )
);
