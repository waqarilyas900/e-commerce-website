-- Variant-level wishlist + restock notification queue (emails sent by app cron).

-- ---------------------------------------------------------------------------
-- wishlist_items
-- ---------------------------------------------------------------------------
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  product_variant_id uuid not null references public.product_variants (id) on delete cascade,
  notify_on_restock boolean not null default false,
  restock_notified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint wishlist_items_user_variant_key unique (user_id, product_variant_id)
);

create index if not exists wishlist_items_user_id_idx on public.wishlist_items (user_id);
create index if not exists wishlist_items_variant_id_idx on public.wishlist_items (product_variant_id);

comment on table public.wishlist_items is 'Per-variant wishlist; notify_on_restock drives restock emails.';
comment on column public.wishlist_items.restock_notified_at is 'Set when a restock email was sent; cleared when variant goes OOS again.';

alter table public.wishlist_items enable row level security;

create policy "wishlist_items_own"
  on public.wishlist_items for all
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = wishlist_items.user_id
        and u.auth_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = wishlist_items.user_id
        and u.auth_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- restock_notification_queue (filled by DB trigger; processed by cron + Resend)
-- ---------------------------------------------------------------------------
create table if not exists public.restock_notification_queue (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  user_id uuid not null references public.users (id) on delete cascade,
  product_variant_id uuid not null references public.product_variants (id) on delete cascade,
  wishlist_item_id uuid not null references public.wishlist_items (id) on delete cascade,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists restock_notification_queue_pending_idx
  on public.restock_notification_queue (processed_at, created_at)
  where processed_at is null;

-- At most one pending job per wishlist row
create unique index if not exists restock_queue_pending_wishlist_uniq
  on public.restock_notification_queue (wishlist_item_id)
  where processed_at is null;

alter table public.restock_notification_queue enable row level security;
-- No policies: only service role / table owner (trigger) can access.

-- ---------------------------------------------------------------------------
-- Trigger: inventory crosses to sellable → enqueue; back to OOS → reset notified
-- ---------------------------------------------------------------------------
create or replace function public.tg_inventory_restock_enqueue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sell_old int;
  sell_new int;
begin
  if tg_op = 'INSERT' then
    sell_old := 0;
    sell_new := greatest(0, coalesce(new.quantity_on_hand, 0) - coalesce(new.quantity_reserved, 0));
  elsif tg_op = 'UPDATE' then
    sell_old := greatest(0, coalesce(old.quantity_on_hand, 0) - coalesce(old.quantity_reserved, 0));
    sell_new := greatest(0, coalesce(new.quantity_on_hand, 0) - coalesce(new.quantity_reserved, 0));
  else
    return coalesce(new, old);
  end if;

  if sell_old < 1 and sell_new >= 1 then
    insert into public.restock_notification_queue (user_email, user_id, product_variant_id, wishlist_item_id)
    select au.email::text, wi.user_id, new.product_variant_id, wi.id
    from public.wishlist_items wi
    inner join public.users u on u.id = wi.user_id
    inner join auth.users au on au.id = u.auth_id
    where wi.product_variant_id = new.product_variant_id
      and wi.notify_on_restock = true
      and wi.restock_notified_at is null
      and au.email is not null
      and length(trim(au.email::text)) > 0
      and not exists (
        select 1
        from public.restock_notification_queue q
        where q.wishlist_item_id = wi.id
          and q.processed_at is null
      );
  end if;

  if sell_new < 1 then
    update public.wishlist_items wi
    set restock_notified_at = null
    where wi.product_variant_id = new.product_variant_id
      and wi.notify_on_restock = true;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_inventory_restock_enqueue on public.inventory;

create trigger trg_inventory_restock_enqueue
  after insert or update
  on public.inventory
  for each row
  execute function public.tg_inventory_restock_enqueue();

comment on function public.tg_inventory_restock_enqueue() is
  'When a variant becomes sellable, enqueue restock emails; when OOS, clear restock_notified_at for subscribers.';
