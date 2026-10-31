alter table public.daily_horoscopes add column if not exists superseded_at timestamptz;
-- Preserve duplicate history, but only one row remains eligible for generation/delivery.
with ranked as (
 select id,row_number() over(partition by user_id,horoscope_date order by
 (twilio_status_1 in ('delivered','read') and twilio_status_2 in ('delivered','read')) desc nulls last,created_at desc,id) as position
 from public.daily_horoscopes where superseded_at is null
)
update public.daily_horoscopes h set superseded_at=now() from ranked r where h.id=r.id and r.position>1;
create unique index daily_horoscopes_user_date_current on public.daily_horoscopes(user_id,horoscope_date) where superseded_at is null;
