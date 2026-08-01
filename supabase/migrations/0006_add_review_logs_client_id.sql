alter table review_logs add column if not exists client_id uuid;

-- 既存行にはランダムなIDを補完(NULLのままだとunique制約でNULL同士は別扱いになるため実害はないが念のため埋める)
update review_logs set client_id = uuid_generate_v4() where client_id is null;

alter table review_logs alter column client_id set not null;
alter table review_logs add constraint review_logs_client_id_key unique (client_id);
