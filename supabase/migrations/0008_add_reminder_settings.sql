create table if not exists reminder_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  remind_hour_jst smallint not null default 20 check (remind_hour_jst >= 0 and remind_hour_jst <= 23),
  last_sent_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table reminder_settings enable row level security;

create policy "reminder_settings_select_own" on reminder_settings
  for select using (auth.uid() = user_id);

create policy "reminder_settings_insert_own" on reminder_settings
  for insert with check (auth.uid() = user_id);

create policy "reminder_settings_update_own" on reminder_settings
  for update using (auth.uid() = user_id);

create policy "reminder_settings_delete_own" on reminder_settings
  for delete using (auth.uid() = user_id);
