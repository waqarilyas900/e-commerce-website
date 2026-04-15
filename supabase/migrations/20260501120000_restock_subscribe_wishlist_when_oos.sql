-- When sellable inventory drops from in-stock to out-of-stock, subscribe all SKU-level wishlist
-- rows for that variant to restock emails. Previously, customers who heart-saved while the
-- item was in stock had notify_on_restock = false and would never be enqueued when stock returned.

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

  -- Subscribe SKU-level wishlist rows when this variant goes out of stock (fixes in-stock saves).
  if sell_old >= 1 and sell_new < 1 then
    update public.wishlist_items wi
    set notify_on_restock = true
    where wi.product_variant_id = new.product_variant_id
      and wi.product_variant_id is not null;
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
  'Enqueue restock emails when stock returns; when variant goes OOS, set notify_on_restock on SKU wishlist rows.';
