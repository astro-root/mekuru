alter table cards add column if not exists position integer;

with ordered as (
  select id, row_number() over (partition by deck_id order by created_at asc, id asc) as rn
  from cards
)
update cards
set position = ordered.rn
from ordered
where cards.id = ordered.id;

alter table cards alter column position set default 0;
alter table cards alter column position set not null;

create index if not exists cards_deck_position_idx on cards (deck_id, position);
