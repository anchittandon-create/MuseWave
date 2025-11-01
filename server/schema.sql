-- Run once in Neon
create table if not exists api_keys (
  key text primary key,
  active boolean default true,
  created_at timestamptz default now()
);

insert into api_keys(key, active)
values ('${MUSEWAVE_ADMIN_API_KEY}', true)
on conflict (key) do update set active=excluded.active;

create table if not exists jobs (
  id uuid primary key,
  status text not null,
  progress int default 0,
  eta_seconds int default 0,
  payload jsonb not null,
  plan jsonb,
  assets jsonb,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists jobs_updated_idx on jobs(updated_at desc);