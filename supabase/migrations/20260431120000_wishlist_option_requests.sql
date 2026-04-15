-- Wishlist: optional rows without product_variant_id (requested option snapshot until SKU exists).
-- Admins can see requested_option_values; restock trigger matches new inventory to snapshots.

-- ---------------------------------------------------------------------------
-- Schema: product_id + nullable variant + option snapshot + fingerprint
-- ---------------------------------------------------------------------------
alter table public.wishlist_items
  add column if not exists product_id uuid references public.products (id) on delete cascade;

alter table public.wishlist_items
  add column if not exists requested_option_values jsonb;

alter table public.wishlist_items
  add column if not exists option_request_fingerprint text;

-- Backfill product_id from existing variant rows
update public.wishlist_items wi
set product_id = v.product_id
from public.product_variants v
where wi.product_variant_id = v.id
  and wi.product_id is null;

alter table public.wishlist_items
  alter column product_id set not null;

alter table public.wishlist_items drop constraint if exists wishlist_items_user_variant_key;

alter table public.wishlist_items drop constraint if exists wishlist_items_product_variant_id_fkey;

alter table public.wishlist_items
  alter column product_variant_id drop not null;

alter table public.wishlist_items
  add constraint wishlist_items_product_variant_id_fkey
  foreign key (product_variant_id) references public.product_variants (id) on delete cascade;

alter table public.wishlist_items
  add constraint wishlist_items_variant_or_options_ck check (
    (
      product_variant_id is not null
      and requested_option_values is null
      and option_request_fingerprint is null
    )
    or (
      product_variant_id is null
      and requested_option_values is not null
      and option_request_fingerprint is not null
    )
  );

create unique index if not exists wishlist_items_user_variant_uidx
  on public.wishlist_items (user_id, product_variant_id)
  where product_variant_id is not null;

create unique index if not exists wishlist_items_user_product_fp_uidx
  on public.wishlist_items (user_id, product_id, option_request_fingerprint)
  where product_variant_id is null;

comment on column public.wishlist_items.requested_option_values is
  'When no SKU exists yet: requested options (e.g. Size + Color). Matched when a variant is added.';
comment on column public.wishlist_items.option_request_fingerprint is
  'SHA-256 hex of canonical JSON for uniqueness (client/server must match).';

-- ---------------------------------------------------------------------------
-- Admin read policy (CRM / catalog)
-- ---------------------------------------------------------------------------
drop policy if exists "wishlist_items_select_admin" on public.wishlist_items;

create policy "wishlist_items_select_admin"
  on public.wishlist_items for select
  to authenticated
  using (public.is_active_admin());

-- ---------------------------------------------------------------------------
-- Restock trigger: also enqueue option-snapshot rows when inventory becomes sellable
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

    insert into public.restock_notification_queue (user_email, user_id, product_variant_id, wishlist_item_id)
    select au.email::text, wi.user_id, new.product_variant_id, wi.id
    from public.wishlist_items wi
    inner join public.product_variants v on v.id = new.product_variant_id
    inner join public.users u on u.id = wi.user_id
    inner join auth.users au on au.id = u.auth_id
    where wi.product_variant_id is null
      and wi.product_id = v.product_id
      and wi.requested_option_values = v.option_values
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

    update public.wishlist_items wi
    set restock_notified_at = null
    from public.product_variants v
    where v.id = new.product_variant_id
      and wi.product_variant_id is null
      and wi.product_id = v.product_id
      and wi.requested_option_values = v.option_values
      and wi.notify_on_restock = true;
  end if;

  return coalesce(new, old);
end;
$$;

comment on function public.tg_inventory_restock_enqueue() is
  'Enqueue restock emails for variant rows and for option-snapshot rows when options match new stock.';
