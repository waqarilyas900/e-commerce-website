-- Allow customers to read catalog rows for products they purchased (order history detail),
-- even if the product was later set to draft or deactivated.

create policy "products_select_if_in_customer_order"
  on public.products for select
  to authenticated
  using (
    exists (
      select 1
      from public.order_items oi
      join public.orders ord on ord.id = oi.order_id
      join public.users u on u.id = ord.user_id
      join public.product_variants pv on pv.id = oi.product_variant_id
      where pv.product_id = products.id
        and u.auth_id = auth.uid()
    )
  );

comment on policy "products_select_if_in_customer_order" on public.products is
  'Snapshot display on order detail: product was visible at purchase time.';

create policy "product_variants_select_if_in_customer_order"
  on public.product_variants for select
  to authenticated
  using (
    exists (
      select 1
      from public.order_items oi
      join public.orders ord on ord.id = oi.order_id
      join public.users u on u.id = ord.user_id
      where oi.product_variant_id = product_variants.id
        and u.auth_id = auth.uid()
    )
  );

comment on policy "product_variants_select_if_in_customer_order" on public.product_variants is
  'Line items on order detail: variant options + link to product images.';
