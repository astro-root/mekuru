alter table decks add column if not exists new_cards_per_day integer;

alter table decks add constraint decks_new_cards_per_day_check check (new_cards_per_day is null or new_cards_per_day >= 0);
