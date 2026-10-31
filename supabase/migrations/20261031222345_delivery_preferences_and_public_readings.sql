alter table public.users add column delivery_day text not null default 'previous_day' check (delivery_day in ('previous_day','same_day')), add column delivery_minute integer not null default 1320 check (delivery_minute between 0 and 1439 and delivery_minute % 15 = 0);
create table public.public_daily_readings (
 reading_date date primary key,
 status text not null default 'pending' check (status in ('pending','processing','ready','error')),
 sections jsonb,
 calculation_reference text not null default 'Buenos Aires · 12:00 ART · lectura general sin casas',
 claim_token uuid,
 updated_at timestamptz not null default now(),
 error text
);
alter table public.public_daily_readings enable row level security;
revoke all on public.public_daily_readings from public,anon,authenticated;
grant select,insert,update,delete on public.public_daily_readings to service_role;
