-- Additive: existing birth data and delivery history are preserved.
create extension if not exists btree_gist with schema extensions;
alter table public.users add column if not exists residence jsonb;
alter table public.daily_horoscopes add column if not exists location_used jsonb;
create table public.user_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  location jsonb not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint trip_dates check (ends_at > starts_at),
  constraint no_overlapping_trips exclude using gist (user_id with =, tstzrange(starts_at, ends_at, '[)') with &&) where (cancelled_at is null)
);
create index user_trips_user_idx on public.user_trips(user_id);
alter table public.user_trips enable row level security;
create policy "Read own trips" on public.user_trips for select to authenticated using (user_id in (select id from public.users where auth_user_id = (select auth.uid())));
revoke all on public.user_trips from anon, authenticated;
grant select on public.user_trips to authenticated;
grant all on public.user_trips to service_role;
create table public.astro_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('natal','solar','solar-event')),
  year int not null,
  location_key text not null default '',
  location jsonb,
  location_basis text,
  return_at timestamptz,
  chart jsonb,
  interpretation text,
  status text not null check (status in ('processing','ready','error')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,kind,year,location_key)
);
alter table public.astro_reports enable row level security;
create policy "Read own reports" on public.astro_reports for select to authenticated using (user_id in (select id from public.users where auth_user_id = (select auth.uid())));
revoke all on public.astro_reports from anon, authenticated;
grant select on public.astro_reports to authenticated;
grant all on public.astro_reports to service_role;
