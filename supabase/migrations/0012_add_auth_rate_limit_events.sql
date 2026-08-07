-- ログイン/パスワードリセットの総当たり攻撃対策用テーブル。
-- Vercelサーバーレス環境ではインメモリのレート制限はインスタンス間で共有されず機能しないため、
-- Supabase側にイベントを記録して判定する。
create table if not exists auth_rate_limit_events (
  id uuid primary key default uuid_generate_v4(),
  bucket_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists auth_rate_limit_events_bucket_created_idx
  on auth_rate_limit_events (bucket_key, created_at desc);

alter table auth_rate_limit_events enable row level security;

-- このテーブルはservice_role(admin client)経由でのみ読み書きする。
-- anon/authenticatedへのポリシーは意図的に用意しない(=誰も直接アクセスできない)。

-- 古いイベントが無限に溜まらないよう、直近24時間より前の行は都度掃除する。
create or replace function cleanup_old_auth_rate_limit_events() returns void as $$
begin
  delete from auth_rate_limit_events where created_at < now() - interval '24 hours';
end;
$$ language plpgsql;
