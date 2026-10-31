alter table public.users add column if not exists billing_checked_at timestamptz;
alter table public.users add column if not exists subscription_paid_until timestamptz;
alter table public.users add column if not exists subscription_grace_until timestamptz;
alter table public.users add column if not exists subscription_paused_at timestamptz;
-- Legacy payments retain their original calendar month; never manufacture a new paid period.
update public.users set subscription_paid_until=last_payment_at+interval '1 month',subscription_grace_until=last_payment_at+interval '1 month 10 days'
where subscription_paid_until is null and last_payment_at is not null;

create table public.billing_payments (
 payment_id text primary key, invoice_id text not null unique, user_id uuid not null references public.users(id),
 subscription_id text not null, paid_at timestamptz not null, period_end timestamptz not null,
 amount numeric not null check(amount>0), currency text not null check(currency='ARS'), created_at timestamptz not null default now()
);
alter table public.billing_payments enable row level security;
revoke all on public.billing_payments from anon,authenticated;
grant all on public.billing_payments to service_role;
create index billing_payments_user_period on public.billing_payments(user_id,period_end desc);

create table public.billing_delivery_jobs (
 id uuid primary key default gen_random_uuid(), payment_id text not null unique references public.billing_payments(payment_id),
 user_id uuid not null references public.users(id), status text not null default 'pending' check(status in ('pending','processing','submitted','error','delivered')),
 attempts int not null default 0, claimed_at timestamptz, claim_token uuid, horoscope_id uuid references public.daily_horoscopes(id), last_error text,
 created_at timestamptz not null default now()
);
alter table public.billing_delivery_jobs enable row level security;
revoke all on public.billing_delivery_jobs from anon,authenticated;
grant all on public.billing_delivery_jobs to service_role;
create index billing_delivery_jobs_pending on public.billing_delivery_jobs(status,created_at);

create or replace function public.record_subscription_payment(p_user_id uuid,p_subscription_id text,p_payment_id text,p_invoice_id text,p_paid_at timestamptz,p_period_end timestamptz,p_amount numeric)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare p public.users%rowtype; inserted_id text; was_allowed boolean; new_end timestamptz;
begin
 select * into p from public.users where id=p_user_id for update;
 if not found or p.mercadopago_subscription_id is distinct from p_subscription_id then raise exception 'Subscription mismatch'; end if;
 if p_period_end<=p_paid_at or p_amount<4990 then raise exception 'Invalid payment period or amount'; end if;
 was_allowed:=p.subscription_status='active' and p.subscription_grace_until>now();
 insert into public.billing_payments(payment_id,invoice_id,user_id,subscription_id,paid_at,period_end,amount,currency)
 values(p_payment_id,p_invoice_id,p_user_id,p_subscription_id,p_paid_at,p_period_end,p_amount,'ARS')
 on conflict do nothing returning payment_id into inserted_id;
 if inserted_id is null then return jsonb_build_object('duplicate',true,'user_id',p.id); end if;
 new_end:=greatest(p.subscription_paid_until,p_period_end);
 update public.users set subscription_paid_until=new_end,subscription_grace_until=new_end+interval '10 days',
 last_payment_at=greatest(last_payment_at,p_paid_at),mercadopago_payment_id=p_payment_id,
 subscription_status=case when mercadopago_subscription_status in ('canceled','cancelled') then 'inactive' when new_end+interval '10 days'>now() then 'active' else 'paused' end,
 subscription_paused_at=case when new_end+interval '10 days'>now() then null else coalesce(subscription_paused_at,now()) end
 where id=p.id;
 if not coalesce(was_allowed,false) and new_end+interval '10 days'>now() and coalesce(p.mercadopago_subscription_status,'') not in ('canceled','cancelled') then
  insert into public.billing_delivery_jobs(payment_id,user_id) values(p_payment_id,p.id) on conflict do nothing;
 end if;
 return jsonb_build_object('duplicate',false,'user_id',p.id,'reactivated',not coalesce(was_allowed,false) and new_end+interval '10 days'>now());
end $$;
revoke all on function public.record_subscription_payment(uuid,text,text,text,timestamptz,timestamptz,numeric) from public,anon,authenticated;
grant execute on function public.record_subscription_payment(uuid,text,text,text,timestamptz,timestamptz,numeric) to service_role;

create or replace function public.expire_subscription_access() returns void language sql security invoker set search_path=pg_catalog,public as $$
 update public.users set subscription_status='paused',subscription_paused_at=coalesce(subscription_paused_at,now())
 where subscription_status='active' and (subscription_grace_until is null or subscription_grace_until<=now());
 update public.billing_delivery_jobs set status='error',last_error='Worker interrupted; reconcile before retry'
 where status='processing' and claimed_at<now()-interval '15 minutes';
 update public.billing_delivery_jobs j set status='delivered' from public.daily_horoscopes h
 where j.horoscope_id=h.id and j.status='submitted' and h.twilio_status_1 in ('delivered','read') and h.twilio_status_2 in ('delivered','read');
 update public.billing_delivery_jobs j set status='error',last_error='WhatsApp delivery failed' from public.daily_horoscopes h
 where j.horoscope_id=h.id and j.status='submitted' and (h.twilio_status_1 in ('failed','undelivered') or h.twilio_status_2 in ('failed','undelivered'));
$$;
revoke all on function public.expire_subscription_access() from public,anon,authenticated;
grant execute on function public.expire_subscription_access() to service_role;
select public.expire_subscription_access();

revoke insert,update,delete,truncate,references,trigger on public.users from anon,authenticated;
select cron.schedule('id-astral-billing-maintenance','*/15 * * * *',$job$
 select public.expire_subscription_access();
 select net.http_post(url:='https://idastral.com/api/billing-maintenance',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='id_astral_cron_secret')),body:='{}'::jsonb,timeout_milliseconds:=30000);
$job$);
