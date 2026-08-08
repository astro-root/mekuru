-- 公開デッキ(decks.is_public = true)のカードを、所有者以外も閲覧できるようにする。
-- decksテーブルには既に decks_public_read ポリシーが存在するが、cardsテーブル側は
-- オーナー限定のポリシーしかなく、公開デッキの中身が閲覧できない不整合があった。
create policy "cards_public_read" on cards for select using (
  exists (select 1 from decks where decks.id = cards.deck_id and decks.is_public = true)
);
