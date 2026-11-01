create or replace function public.due_horoscope_ids(p_limit integer default 10)
returns table(id uuid)
language sql stable security invoker set search_path = pg_catalog, public
as $$
 select h.id
 from public.daily_horoscopes h
 join public.users u on u.id=h.user_id
 cross join lateral (
   select coalesce(
     (select t.location->>'timezone' from public.user_trips t
      where t.user_id=u.id and t.cancelled_at is null and t.starts_at<=now() and now()<t.ends_at
      order by t.starts_at desc limit 1),
     u.residence->>'timezone',u.timezone,'America/Argentina/Buenos_Aires') as zone
 ) z
 cross join lateral (
   select now() at time zone case when exists(select 1 from pg_catalog.pg_timezone_names n where n.name=z.zone)
     then z.zone else 'America/Argentina/Buenos_Aires' end as local_now
 ) clock
 where h.send_status='pending' and h.superseded_at is null
 and u.subscription_status='active' and u.subscription_paid_until is not null and u.subscription_grace_until>now()
 and h.horoscope_date>=clock.local_now::date
 and h.horoscope_date<=clock.local_now::date + case when u.delivery_day='previous_day' then 1 else 0 end
 and (
   (u.delivery_day='previous_day' and h.horoscope_date=clock.local_now::date)
   or extract(hour from clock.local_now)*60+extract(minute from clock.local_now)>=u.delivery_minute
 )
 order by h.horoscope_date,h.id
 limit least(greatest(p_limit,1),100);
$$;
revoke all on function public.due_horoscope_ids(integer) from public,anon,authenticated;
grant execute on function public.due_horoscope_ids(integer) to service_role;
create index if not exists daily_horoscopes_pending_schedule_idx on public.daily_horoscopes(horoscope_date,user_id) where send_status='pending' and superseded_at is null;
