alter table cards
  add column if not exists is_favorite boolean not null default false,
  add column if not exists is_suspended boolean not null default false;

create index if not exists cards_deck_suspended_idx on cards (deck_id, is_suspended);
