-- The policy "products_select_if_in_customer_order" joined product_variants inside a
-- products USING clause; product_variants RLS references products → infinite recursion.
-- Replace with a SECURITY DEFINER helper with row_security off for this bounded EXISTS
-- (still scoped by auth.uid(); only superuser/migration role can create such a function).

drop policy if exists "products_select_if_in_customer_order" on public.products;

create or replace function public.user_has_ordered_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.orders ord on ord.id = oi.order_id
    join public.users u on u.id = ord.user_id
    join public.product_variants pv on pv.id = oi.product_variant_id
    where pv.product_id = p_product_id
      and u.auth_id = auth.uid()
  );
$$;

comment on function public.user_has_ordered_product(uuid) is
  'True when the current user has an order line for a variant of this product (order history images).';

revoke all on function public.user_has_ordered_product(uuid) from public;
grant execute on function public.user_has_ordered_product(uuid) to anon, authenticated;

create policy "products_select_if_in_customer_order"
  on public.products for select
  to authenticated
  using (public.user_has_ordered_product(id));

comment on policy "products_select_if_in_customer_order" on public.products is
  'Order-detail snapshot; implemented via user_has_ordered_product() to avoid RLS recursion.';
