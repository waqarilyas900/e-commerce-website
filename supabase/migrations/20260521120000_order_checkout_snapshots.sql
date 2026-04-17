-- Point-in-time snapshots on orders and line items (catalog-independent record of checkout).

alter table public.orders
  add column if not exists checkout_snapshot jsonb not null default '{}'::jsonb;

alter table public.order_items
  add column if not exists product_slug_snapshot text not null default '';

alter table public.order_items
  add column if not exists primary_image_url_snapshot text not null default '';

alter table public.order_items
  add column if not exists compare_at_unit_price_cents integer;

alter table public.order_items
  add column if not exists line_subtotal_cents integer;

alter table public.order_items
  add column if not exists inventory_on_hand_before integer;

alter table public.order_items
  add column if not exists inventory_reserved_before integer;

update public.order_items
set line_subtotal_cents = unit_price_cents * quantity
where line_subtotal_cents is null;

alter table public.order_items
  alter column line_subtotal_cents set not null;

create or replace function public.place_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user_id uuid;
  v_items jsonb := coalesce(p_payload->'items', '[]'::jsonb);
  v_email text := nullif(trim(coalesce(p_payload->>'email', '')), '');
  v_first text := nullif(trim(coalesce(p_payload->>'first_name', '')), '');
  v_last text := nullif(trim(coalesce(p_payload->>'last_name', '')), '');
  v_phone text := nullif(trim(coalesce(p_payload->>'phone', '')), '');
  v_street text := nullif(trim(coalesce(p_payload->>'shipping_street', '')), '');
  v_city text := nullif(trim(coalesce(p_payload->>'shipping_city', '')), '');
  v_postal text := nullif(trim(coalesce(p_payload->>'shipping_postal_code', '')), '');
  v_province text := nullif(trim(coalesce(p_payload->>'shipping_province', '')), '');
  v_country text := upper(nullif(trim(coalesce(p_payload->>'shipping_country', '')), ''));
  v_note text := nullif(trim(coalesce(p_payload->>'customer_note', '')), '');

  v_shipping_cents int;
  v_standard_delivery_paisa int;
  v_free_rules jsonb;
  v_free_matches boolean := false;
  v_std_currency text;
  v_discount_cents int := 0;
  v_currency text := coalesce(nullif(trim(coalesce(p_payload->>'currency', '')), ''), 'USD');

  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_subtotal_cents bigint := 0;
  v_total_cents bigint;
  v_checkout_snapshot jsonb;

  rec record;
  v_variant_id uuid;
  v_qty int;
  v_line_cents bigint;
  v_sku text;
  v_pname text;
  v_opts jsonb;
  v_price numeric;
  v_cmp_at numeric;
  v_slug text;
  v_img text;
  v_compare_at_unit_price_cents int;
  v_qoh int;
  v_qres int;
  v_item_line_subtotal int;
  v_avail int;
  v_tries int := 0;
  v_row_count int;
begin
  if v_email is null or position('@' in v_email) < 2 then
    return jsonb_build_object('ok', false, 'error', 'Valid email is required');
  end if;
  if v_first is null or v_last is null then
    return jsonb_build_object('ok', false, 'error', 'First and last name are required');
  end if;
  if v_phone is null then
    return jsonb_build_object('ok', false, 'error', 'Phone is required');
  end if;
  if v_street is null or v_city is null or v_postal is null or v_province is null then
    return jsonb_build_object('ok', false, 'error', 'Complete shipping address is required');
  end if;

  if v_country is null or length(v_country) <> 2 then
    v_country := 'PK';
  end if;
  if v_country <> 'PK' then
    return jsonb_build_object('ok', false, 'error', 'Shipping is only available within Pakistan');
  end if;

  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Cart is empty');
  end if;
  if jsonb_array_length(v_items) > 50 then
    return jsonb_build_object('ok', false, 'error', 'Too many line items');
  end if;

  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object('variant_id', vid, 'quantity', q)
        order by vid
      )
      from (
        select
          (elem->>'variant_id')::uuid as vid,
          sum(greatest(coalesce((elem->>'quantity')::int, 0), 0))::int as q
        from jsonb_array_elements(v_items) as t(elem)
        group by 1
      ) s
      where q > 0
    ),
    '[]'::jsonb
  )
  into v_items;

  if jsonb_array_length(v_items) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Cart is empty');
  end if;

  if v_uid is not null then
    select u.id into v_user_id from public.users u where u.auth_id = v_uid limit 1;
  end if;

  for rec in
    select
      (elem->>'variant_id')::uuid as variant_id,
      coalesce((elem->>'quantity')::int, 0) as quantity
    from jsonb_array_elements(v_items) as t(elem)
  loop
    v_variant_id := rec.variant_id;
    v_qty := rec.quantity;

    if v_variant_id is null or v_qty < 1 or v_qty > 999 then
      return jsonb_build_object('ok', false, 'error', 'Invalid line item');
    end if;

    select
      pv.sku,
      pv.option_values,
      pv.price,
      p.name,
      greatest(
        0,
        coalesce(inv.quantity_on_hand, 0) - coalesce(inv.quantity_reserved, 0)
      )::int
    into v_sku, v_opts, v_price, v_pname, v_avail
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    left join public.inventory inv on inv.product_variant_id = pv.id
    where pv.id = v_variant_id
      and p.status = 'active'::public.product_status;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'One or more products are no longer available');
    end if;

    if v_avail < v_qty then
      return jsonb_build_object('ok', false, 'error', 'Insufficient stock for ' || coalesce(v_pname, 'an item'));
    end if;

    v_line_cents := round(v_price * 100)::bigint;
    if v_line_cents < 0 then
      return jsonb_build_object('ok', false, 'error', 'Invalid price');
    end if;

    v_subtotal_cents := v_subtotal_cents + (v_line_cents * v_qty);
  end loop;

  if v_subtotal_cents > 2000000000 then
    return jsonb_build_object('ok', false, 'error', 'Order total too large');
  end if;

  v_standard_delivery_paisa := coalesce(
    (select ss.standard_delivery_paisa from public.store_settings ss where ss.id = 1),
    50000
  );
  v_std_currency := upper(btrim(coalesce(
    (select ss.standard_delivery_currency from public.store_settings ss where ss.id = 1),
    'PKR'
  )));
  v_free_rules := coalesce(
    (select ss.free_delivery_thresholds_paisa from public.store_settings ss where ss.id = 1),
    '[]'::jsonb
  );

  if v_standard_delivery_paisa < 0 or v_standard_delivery_paisa > 2000000000 then
    return jsonb_build_object('ok', false, 'error', 'Invalid store shipping settings');
  end if;

  if v_std_currency is distinct from 'PKR' then
    return jsonb_build_object('ok', false, 'error', 'Checkout requires standard delivery in PKR');
  end if;

  if jsonb_typeof(v_free_rules) = 'array' and jsonb_array_length(v_free_rules) > 0 then
    select exists (
      select 1
      from jsonb_array_elements(v_free_rules) as fr(elem)
      where jsonb_typeof(elem) = 'number'
        and v_subtotal_cents >= (elem::text::bigint)
    ) into v_free_matches;
  end if;

  if v_free_matches then
    v_shipping_cents := 0;
  else
    v_shipping_cents := v_standard_delivery_paisa;
  end if;

  v_total_cents := v_subtotal_cents + v_shipping_cents - v_discount_cents;
  if v_total_cents < 0 or v_total_cents > 2147483647 then
    return jsonb_build_object('ok', false, 'error', 'Invalid total');
  end if;

  v_checkout_snapshot := jsonb_build_object(
    'delivery', jsonb_build_object(
      'standard_delivery_paisa', v_standard_delivery_paisa,
      'standard_delivery_currency', v_std_currency,
      'free_delivery_thresholds_paisa', coalesce(v_free_rules, '[]'::jsonb),
      'merchandise_subtotal_paisa', v_subtotal_cents,
      'shipping_charged_paisa', v_shipping_cents,
      'free_shipping_applied', v_free_matches
    )
  );

  loop
    v_tries := v_tries + 1;
    exit when v_tries > 8;
    v_order_number := 'ORD-' || to_char(timezone('utc', now()), 'YYYYMMDD') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.orders o where o.order_number = v_order_number);
  end loop;
  if v_tries > 8 or v_order_number is null then
    return jsonb_build_object('ok', false, 'error', 'Could not allocate order reference');
  end if;

  insert into public.orders (
    id,
    user_id,
    email,
    status,
    subtotal_cents,
    discount_cents,
    shipping_cents,
    total_cents,
    currency,
    discount_id,
    shipping_method_id,
    order_number,
    first_name,
    last_name,
    phone,
    shipping_street,
    shipping_city,
    shipping_postal_code,
    shipping_province,
    shipping_country,
    payment_method,
    customer_note,
    checkout_snapshot,
    created_at,
    updated_at
  ) values (
    v_order_id,
    v_user_id,
    v_email,
    'pending',
    v_subtotal_cents::int,
    v_discount_cents,
    v_shipping_cents,
    v_total_cents::int,
    v_currency,
    null,
    null,
    v_order_number,
    coalesce(v_first, ''),
    coalesce(v_last, ''),
    coalesce(v_phone, ''),
    coalesce(v_street, ''),
    coalesce(v_city, ''),
    coalesce(v_postal, ''),
    coalesce(v_province, ''),
    v_country,
    'cod',
    coalesce(v_note, ''),
    v_checkout_snapshot,
    now(),
    now()
  );

  for rec in
    select
      (elem->>'variant_id')::uuid as variant_id,
      coalesce((elem->>'quantity')::int, 0) as quantity
    from jsonb_array_elements(v_items) as t(elem)
  loop
    v_variant_id := rec.variant_id;
    v_qty := rec.quantity;

    select
      pv.sku,
      pv.option_values,
      pv.price,
      pv.compare_at_price,
      p.name,
      coalesce(p.slug, ''),
      case
        when jsonb_typeof(p.images) = 'array' and coalesce(jsonb_array_length(p.images), 0) > 0
        then coalesce(p.images->>0, '')
        else ''
      end,
      coalesce(inv.quantity_on_hand, 0)::int,
      coalesce(inv.quantity_reserved, 0)::int
    into v_sku, v_opts, v_price, v_cmp_at, v_pname, v_slug, v_img, v_qoh, v_qres
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    left join public.inventory inv on inv.product_variant_id = pv.id
    where pv.id = v_variant_id
      and p.status = 'active'::public.product_status;

    if not found then
      raise exception 'variant unavailable during fulfillment' using errcode = 'P0001';
    end if;

    v_line_cents := round(v_price * 100)::bigint;
    v_compare_at_unit_price_cents := case
      when v_cmp_at is not null then round(v_cmp_at * 100)::int
      else null
    end;
    v_item_line_subtotal := (v_line_cents * v_qty)::int;

    insert into public.order_items (
      order_id,
      product_variant_id,
      product_name_snapshot,
      sku_snapshot,
      unit_price_cents,
      quantity,
      option_values_snapshot,
      product_slug_snapshot,
      primary_image_url_snapshot,
      compare_at_unit_price_cents,
      line_subtotal_cents,
      inventory_on_hand_before,
      inventory_reserved_before
    ) values (
      v_order_id,
      v_variant_id,
      v_pname,
      v_sku,
      v_line_cents::int,
      v_qty,
      coalesce(v_opts, '{}'::jsonb),
      v_slug,
      v_img,
      v_compare_at_unit_price_cents,
      v_item_line_subtotal,
      v_qoh,
      v_qres
    );

    update public.inventory inv
    set
      quantity_on_hand = inv.quantity_on_hand - v_qty,
      updated_at = now()
    where inv.product_variant_id = v_variant_id
      and (inv.quantity_on_hand - inv.quantity_reserved) >= v_qty;

    get diagnostics v_row_count = row_count;
    if v_row_count <> 1 then
      raise exception 'inventory update failed for variant %', v_variant_id using errcode = 'P0001';
    end if;
  end loop;

  insert into public.order_status_history (order_id, status, note)
  values (v_order_id, 'pending', 'Order placed');

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_cents', v_total_cents::int
  );
end;
$$;

comment on function public.place_order(jsonb) is
  'Checkout: PKR delivery from store_settings; snapshots line items and delivery rules at order time.';
