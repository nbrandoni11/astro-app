alter table public.users add column if not exists birth_google_place_id text;
create table public.google_places_cache (
 place_id text primary key,
 location jsonb not null,
 expires_at timestamptz not null
);
create index google_places_cache_expiry on public.google_places_cache(expires_at);
alter table public.google_places_cache enable row level security;
revoke all on public.google_places_cache from public, anon, authenticated;
grant all on public.google_places_cache to service_role;
create table public.google_places_usage (
 id bigint generated always as identity primary key,
 operation text not null check(operation in ('autocomplete','details','timezone')),
 client text not null,
 created_at timestamptz not null default now()
);
create index google_places_usage_operation_time on public.google_places_usage(operation,created_at);
create index google_places_usage_client_time on public.google_places_usage(client,created_at);
alter table public.google_places_usage enable row level security;
revoke all on public.google_places_usage from public,anon,authenticated;
grant all on public.google_places_usage to service_role;
grant usage,select on sequence public.google_places_usage_id_seq to service_role;
create function public.reserve_google_places_request(operation text,client text) returns boolean
language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if operation not in ('autocomplete','details','timezone') or length(client)>100 then return false; end if;
 -- Serialize check + increment across every deployment and server instance.
 perform pg_advisory_xact_lock(819233,1);
 delete from public.google_places_usage where created_at < now()-interval '32 days';
 if (select count(*) from public.google_places_usage u where u.operation=reserve_google_places_request.operation) >= 9000 then return false; end if;
 if client <> 'internal' and (select count(*) from public.google_places_usage u where u.client=reserve_google_places_request.client and u.created_at>now()-interval '1 minute')>=40 then return false; end if;
 insert into public.google_places_usage(operation,client) values(reserve_google_places_request.operation,reserve_google_places_request.client);
 return true;
end $$;
revoke all on function public.reserve_google_places_request(text,text) from public,anon,authenticated;
grant execute on function public.reserve_google_places_request(text,text) to service_role;
-- Keep only short-lived provider content. Place IDs and user-entered text are
-- stored separately in profiles/trips; no Google credentials are in the DB.
select cron.schedule('id-astral-places-cache-cleanup','17 * * * *',
 $$delete from public.google_places_cache where expires_at < now(); delete from public.google_places_usage where created_at < now()-interval '32 days';$$);
