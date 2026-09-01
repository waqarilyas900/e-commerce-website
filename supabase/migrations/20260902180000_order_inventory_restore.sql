-- Restore variant inventory when an admin cancels/refunds/deletes an order (idempotent).

alter table public.orders
  add column if not exists inventory_restored_at timestamptz;

comment on column public.orders.inventory_restored_at is
  'Set when checkout stock has been returned to inventory (cancel/refund/delete). Prevents double restore.';

create or replace function public.restore_order_inventory(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restored_at timestamptz;
  v_item record;
  v_lines int := 0;
  v_row_count int;
begin
  if not public.is_active_admin() then
    return jsonb_build_object('ok', false, 'error', 'admin required');
  end if;

  select inventory_restored_at
  into v_restored_at
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'order not found');
  end if;

  if v_restored_at is not null then
    return jsonb_build_object('ok', true, 'already_restored', true, 'restored_lines', 0);
  end if;

  for v_item in
    select oi.product_variant_id, oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.quantity > 0
  loop
    update public.inventory inv
    set
      quantity_on_hand = inv.quantity_on_hand + v_item.quantity,
      updated_at = now()
    where inv.product_variant_id = v_item.product_variant_id;

    get diagnostics v_row_count = row_count;

    if v_row_count = 0 then
      insert into public.inventory (product_variant_id, quantity_on_hand, quantity_reserved)
      values (v_item.product_variant_id, v_item.quantity, 0)
      on conflict (product_variant_id) do update
      set
        quantity_on_hand = public.inventory.quantity_on_hand + excluded.quantity_on_hand,
        updated_at = now();
    end if;

    v_lines := v_lines + 1;
  end loop;

  update public.orders
  set
    inventory_restored_at = now(),
    updated_at = now()
  where id = p_order_id;

  return jsonb_build_object('ok', true, 'restored_lines', v_lines);
end;
$$;

revoke all on function public.restore_order_inventory(uuid) from public;
grant execute on function public.restore_order_inventory(uuid) to authenticated;

comment on function public.restore_order_inventory(uuid) is
  'Admin-only: return order line quantities to inventory once per order.';
