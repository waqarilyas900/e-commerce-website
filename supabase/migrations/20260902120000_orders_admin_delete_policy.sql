-- Allow active admins to permanently delete orders (cascades to order_items + order_status_history).
create policy "orders_delete_admin"
  on public.orders for delete
  to authenticated
  using (public.is_active_admin());
