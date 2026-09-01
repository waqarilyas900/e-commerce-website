-- Admin panel enhancements: internal order notes, customer profile edits, abandoned-cart visibility.

alter table public.orders
  add column if not exists admin_internal_note text not null default '';

comment on column public.orders.admin_internal_note is
  'Private admin-only note; never shown on the storefront.';

create policy "users_update_admin"
  on public.users for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "cart_items_select_admin"
  on public.cart_items for select
  to authenticated
  using (public.is_active_admin());
