-- Duplicate-phone checkout lookup, wishlist price-drop queue, review thank-you voucher tracking.

-- ---------------------------------------------------------------------------
-- Checkout: recent order by phone (24h window)
-- ---------------------------------------------------------------------------
create or replace function public.checkout_recent_phone_order(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text;
  v_national text;
  v_row record;
begin
  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if v_digits like '92%' and length(v_digits) >= 12 then
    v_national := substring(v_digits from 3 for 10);
  elsif v_digits like '0%' then
    v_national := substring(v_digits from 2 for 10);
  else
    v_national := v_digits;
  end if;

  if v_national !~ '^3[0-9]{9}$' then
    return jsonb_build_object('recent', false);
  end if;

  select o.order_number, o.created_at
  into v_row
  from public.orders o
  where o.created_at >= now() - interval '24 hours'
    and o.status not in ('cancelled'::public.order_status, 'refunded'::public.order_status)
    and regexp_replace(coalesce(o.phone, ''), '\D', '', 'g') in (
      v_national,
      '0' || v_national,
      '92' || v_national
    )
  order by o.created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('recent', false);
  end if;

  return jsonb_build_object(
    'recent', true,
    'order_number', v_row.order_number,
    'placed_at', v_row.created_at
  );
end;
$$;

revoke all on function public.checkout_recent_phone_order(text) from public;
grant execute on function public.checkout_recent_phone_order(text) to service_role;

-- ---------------------------------------------------------------------------
-- Wishlist price-drop notifications
-- ---------------------------------------------------------------------------
alter table public.wishlist_items
  add column if not exists price_drop_last_notified_price numeric(12, 2);

comment on column public.wishlist_items.price_drop_last_notified_price is
  'Last variant unit price emailed for a price drop; re-notify when price falls below this.';

create table if not exists public.price_drop_notification_queue (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  user_id uuid not null references public.users (id) on delete cascade,
  product_variant_id uuid not null references public.product_variants (id) on delete cascade,
  wishlist_item_id uuid not null references public.wishlist_items (id) on delete cascade,
  old_price numeric(12, 2) not null,
  new_price numeric(12, 2) not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists price_drop_notification_queue_pending_idx
  on public.price_drop_notification_queue (processed_at, created_at)
  where processed_at is null;

create unique index if not exists price_drop_queue_pending_wishlist_uniq
  on public.price_drop_notification_queue (wishlist_item_id)
  where processed_at is null;

alter table public.price_drop_notification_queue enable row level security;

drop policy if exists "price_drop_notification_queue_select_admin" on public.price_drop_notification_queue;
create policy "price_drop_notification_queue_select_admin"
  on public.price_drop_notification_queue for select
  to authenticated
  using (public.is_active_admin());

create or replace function public.tg_variant_price_drop_enqueue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.price is not null and old.price is not null
     and new.price < old.price then
    insert into public.price_drop_notification_queue (
      user_email,
      user_id,
      product_variant_id,
      wishlist_item_id,
      old_price,
      new_price
    )
    select
      au.email::text,
      wi.user_id,
      new.id,
      wi.id,
      old.price,
      new.price
    from public.wishlist_items wi
    inner join public.users u on u.id = wi.user_id
    inner join auth.users au on au.id = u.auth_id
    where wi.product_variant_id = new.id
      and au.email is not null
      and length(trim(au.email::text)) > 0
      and (
        wi.price_drop_last_notified_price is null
        or new.price < wi.price_drop_last_notified_price
      )
      and not exists (
        select 1
        from public.price_drop_notification_queue q
        where q.wishlist_item_id = wi.id
          and q.processed_at is null
      );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_variant_price_drop_enqueue on public.product_variants;
create trigger trg_variant_price_drop_enqueue
  after update of price
  on public.product_variants
  for each row
  execute function public.tg_variant_price_drop_enqueue();

-- ---------------------------------------------------------------------------
-- Review thank-you voucher (once per review)
-- ---------------------------------------------------------------------------
alter table public.reviews
  add column if not exists thank_you_voucher_sent_at timestamptz;

comment on column public.reviews.thank_you_voucher_sent_at is
  'When a one-time post-approval discount code email was sent for this review.';

-- Daily pg_cron → price-drop notifications on storefront
create or replace function public.invoke_price_drop_notifications_cron()
returns void
language plpgsql
security definer
set search_path = public, vault, net
as $fn$
declare
  fn_url constant text :=
    'https://www.simplecartstore.com/api/cron/price-drop-notifications';
  bearer text;
begin
  select ds.decrypted_secret into bearer
  from vault.decrypted_secrets as ds
  where ds.name = 'edge_cron_shared_secret'
  limit 1;

  if bearer is null or length(trim(bearer)) = 0 then
    raise warning 'invoke_price_drop_notifications_cron: missing vault secret edge_cron_shared_secret';
    return;
  end if;

  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(bearer)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
end;
$fn$;

revoke all on function public.invoke_price_drop_notifications_cron() from public;

do $outer$
declare
  jid integer;
begin
  select j.jobid into jid
  from cron.job as j
  where j.jobname = 'price_drop_notifications_daily'
  limit 1;
  if jid is not null then
    perform cron.unschedule(jid);
  end if;
end;
$outer$;

select cron.schedule(
  'price_drop_notifications_daily',
  '0 2 * * *',
  $job$select public.invoke_price_drop_notifications_cron();$job$
);
