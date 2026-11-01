-- Integration regression test. Run only in a dedicated SQL connection with
-- test.delivery_user_id set to an owned test profile that has a stored reading.
-- No external API calls; all fixture changes are rolled back.
begin;
create temp table delivery_fixture_template as select * from public.daily_horoscopes where user_id=current_setting('test.delivery_user_id')::uuid order by horoscope_date desc limit 1;
update public.daily_horoscopes set superseded_at=now() where user_id=current_setting('test.delivery_user_id')::uuid;
update public.users set subscription_status='active',subscription_paid_until=now()+interval '1 day',subscription_grace_until=now()+interval '11 days',delivery_day='same_day',delivery_minute=0 where id=current_setting('test.delivery_user_id')::uuid;
insert into public.daily_horoscopes select (jsonb_populate_record(null::public.daily_horoscopes,to_jsonb(t)||jsonb_build_object('id',gen_random_uuid(),'horoscope_date',('1990-01-01'::date+g)::text,'send_status','pending','superseded_at',null))).* from delivery_fixture_template t cross join generate_series(0,99) g;
insert into public.daily_horoscopes select (jsonb_populate_record(null::public.daily_horoscopes,to_jsonb(t)||jsonb_build_object('id',gen_random_uuid(),'horoscope_date',(now() at time zone 'America/Argentina/Buenos_Aires')::date::text,'send_status','pending','superseded_at',null))).* from delivery_fixture_template t;
do $$ begin
 if (select count(*) from public.due_horoscope_ids(10))<>1 then raise exception 'Eligible reading blocked by stale queue'; end if;
 if has_function_privilege('anon','public.due_horoscope_ids(integer)','EXECUTE') or has_function_privilege('authenticated','public.due_horoscope_ids(integer)','EXECUTE') then raise exception 'Private queue exposed'; end if;
end $$;
update public.users set delivery_minute=1425 where id=current_setting('test.delivery_user_id')::uuid;
do $$ begin
 if extract(hour from now() at time zone 'America/Argentina/Buenos_Aires')*60+extract(minute from now() at time zone 'America/Argentina/Buenos_Aires')<1425 and (select count(*) from public.due_horoscope_ids(10))<>0 then raise exception 'Reading released early'; end if;
end $$;
update public.users set delivery_minute=0,subscription_status='paused' where id=current_setting('test.delivery_user_id')::uuid;
do $$ begin if (select count(*) from public.due_horoscope_ids(10))<>0 then raise exception 'Paused subscription eligible'; end if; end $$;
select 'PASS: 100 stale rows do not block today; chosen time and pause enforced; private function' as result;
rollback;
