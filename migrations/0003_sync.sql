create table if not exists airports (
  code text primary key,
  name text not null default '',
  country text not null default '',
  last_synced_at timestamptz
);

create index if not exists airports_last_synced_idx on airports (last_synced_at);

alter table sync_meta add column if not exists last_tick_at timestamptz;
alter table sync_meta add column if not exists cursor_code text;
alter table sync_meta add column if not exists last_error text;
alter table sync_meta add column if not exists last_batch_count integer not null default 0;
alter table sync_meta add column if not exists discover_letter text;
alter table sync_meta add column if not exists last_full_at timestamptz;
