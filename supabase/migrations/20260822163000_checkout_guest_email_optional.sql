-- Guest checkout: email optional (phone + address required). Validate format only when provided.

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
  v_voucher_code text := nullif(trim(upper(coalesce(p_payload->>'voucher_code', ''))), '');

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
  v_line_free_delivery boolean;
  v_chargeable_subtotal_cents bigint := 0;
  v_tries int := 0;
  v_row_count int;

  v_cart_product_ids uuid[] := '{}'::uuid[];
  v_product_id uuid;
  v_quote jsonb;
  v_v_kind text;
  v_v_instance_id uuid;
  v_v_batch_id uuid;
  v_shr_id uuid;
  v_sub_pkr numeric(14, 4);
begin
  if v_email is not null and position('@' in v_email) < 2 then
    return jsonb_build_object('ok', false, 'error', 'Invalid email address', 'error_code', 'validation');
  end if;
  if v_first is null or v_last is null then
    return jsonb_build_object('ok', false, 'error', 'First and last name are required', 'error_code', 'validation');
  end if;
  if v_phone is null then
    return jsonb_build_object('ok', false, 'error', 'Phone is required', 'error_code', 'validation');
  end if;
  if v_street is null or v_city is null or v_province is null then
    return jsonb_build_object('ok', false, 'error', 'Complete shipping address is required', 'error_code', 'validation');
  end if;

  if v_country is null or length(v_country) <> 2 then
    v_country := 'PK';
  end if;
  if v_country <> 'PK' then
    return jsonb_build_object('ok', false, 'error', 'Shipping is only available within Pakistan', 'error_code', 'shipping');
  end if;

  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Cart is empty', 'error_code', 'empty_cart');
  end if;
  if jsonb_array_length(v_items) > 50 then
    return jsonb_build_object('ok', false, 'error', 'Too many line items', 'error_code', 'too_many_items');
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
    return jsonb_build_object('ok', false, 'error', 'Cart is empty', 'error_code', 'empty_cart');
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
      return jsonb_build_object('ok', false, 'error', 'Invalid line item', 'error_code', 'invalid_line');
    end if;

    select
      pv.sku,
      pv.option_values,
      pv.price,
      p.name,
      p.id,
      coalesce(p.free_delivery, false),
      greatest(
        0,
        coalesce(inv.quantity_on_hand, 0) - coalesce(inv.quantity_reserved, 0)
      )::int
    into v_sku, v_opts, v_price, v_pname, v_product_id, v_line_free_delivery, v_avail
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    left join public.inventory inv on inv.product_variant_id = pv.id
    where pv.id = v_variant_id
      and p.status = 'active'::public.product_status;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'One or more products are no longer available', 'error_code', 'unavailable');
    end if;

    if v_avail < v_qty then
      return jsonb_build_object('ok', false, 'error', 'Insufficient stock for ' || coalesce(v_pname, 'an item'), 'error_code', 'stock');
    end if;

    v_line_cents := round(v_price * 100)::bigint;
    if v_line_cents < 0 then
      return jsonb_build_object('ok', false, 'error', 'Invalid price', 'error_code', 'price');
    end if;

    v_subtotal_cents := v_subtotal_cents + (v_line_cents * v_qty);
    if not coalesce(v_line_free_delivery, false) then
      v_chargeable_subtotal_cents := v_chargeable_subtotal_cents + (v_line_cents * v_qty);
    end if;
    if v_product_id is not null and not (v_product_id = any (v_cart_product_ids)) then
      v_cart_product_ids := array_append(v_cart_product_ids, v_product_id);
    end if;
  end loop;

  if v_subtotal_cents > 2000000000 then
    return jsonb_build_object('ok', false, 'error', 'Order total too large', 'error_code', 'too_large');
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
    return jsonb_build_object('ok', false, 'error', 'Invalid store shipping settings', 'error_code', 'store_settings');
  end if;

  if v_std_currency is distinct from 'PKR' then
    return jsonb_build_object('ok', false, 'error', 'Checkout requires standard delivery in PKR', 'error_code', 'currency');
  end if;

  if v_chargeable_subtotal_cents <= 0 then
    v_shipping_cents := 0;
    v_free_matches := true;
  else
    v_free_matches := false;
    if jsonb_typeof(v_free_rules) = 'array' and jsonb_array_length(v_free_rules) > 0 then
      select exists (
        select 1
        from jsonb_array_elements(v_free_rules) as fr(elem)
        where jsonb_typeof(elem) = 'number'
          and v_chargeable_subtotal_cents >= (elem::text::bigint)
      ) into v_free_matches;
    end if;
    if v_free_matches then
      v_shipping_cents := 0;
    else
      v_shipping_cents := v_standard_delivery_paisa;
    end if;
  end if;

  if v_voucher_code is not null then
    if v_user_id is null then
      return jsonb_build_object(
        'ok', false,
        'error', 'Sign in to use a voucher code',
        'error_code', 'voucher_sign_in_required'
      );
    end if;
    v_sub_pkr := (v_subtotal_cents::numeric / 100.0);
    v_quote := public._voucher_quote(v_user_id, v_voucher_code, v_sub_pkr, v_cart_product_ids, true);
    if coalesce((v_quote->>'ok')::boolean, false) is not true then
      return v_quote;
    end if;
    v_discount_cents := (v_quote->>'discount_cents')::int;
    v_v_kind := v_quote->>'kind';
    v_v_batch_id := (v_quote->>'batch_id')::uuid;
    if v_v_kind = 'multi' then
      v_v_instance_id := (v_quote->>'instance_id')::uuid;
    else
      v_v_instance_id := null;
    end if;
  end if;

  v_total_cents := v_subtotal_cents + v_shipping_cents - v_discount_cents::bigint;
  if v_total_cents < 0 or v_total_cents > 2147483647 then
    return jsonb_build_object('ok', false, 'error', 'Invalid total', 'error_code', 'total');
  end if;

  v_checkout_snapshot := jsonb_build_object(
    'delivery', jsonb_build_object(
      'standard_delivery_paisa', v_standard_delivery_paisa,
      'standard_delivery_currency', v_std_currency,
      'free_delivery_thresholds_paisa', coalesce(v_free_rules, '[]'::jsonb),
      'merchandise_subtotal_paisa', v_subtotal_cents,
      'chargeable_merchandise_subtotal_paisa', v_chargeable_subtotal_cents,
      'shipping_charged_paisa', v_shipping_cents,
      'free_shipping_applied', v_free_matches
    ),
    'voucher', case
      when v_voucher_code is null then null::jsonb
      else jsonb_build_object(
        'code_masked', case when length(v_voucher_code) <= 4 then '****' else left(v_voucher_code, 3) || '***' end,
        'batch_id', v_v_batch_id,
        'kind', v_v_kind,
        'discount_cents', v_discount_cents
      )
    end
  );

  loop
    v_tries := v_tries + 1;
    exit when v_tries > 8;
    v_order_number := 'ORD-' || to_char(timezone('utc', now()), 'YYYYMMDD') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.orders o where o.order_number = v_order_number);
  end loop;
  if v_tries > 8 or v_order_number is null then
    return jsonb_build_object('ok', false, 'error', 'Could not allocate order reference', 'error_code', 'order_ref');
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
    voucher_instance_id,
    shared_voucher_redemption_id,
    created_at,
    updated_at
  ) values (
    v_order_id,
    v_user_id,
    coalesce(v_email, ''),
    'pending'::public.order_status,
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
    'cod'::public.payment_method,
    coalesce(v_note, ''),
    v_checkout_snapshot,
    null,
    null,
    now(),
    now()
  );

  if v_voucher_code is not null and v_discount_cents > 0 and v_user_id is not null then
    if v_v_kind = 'multi' and v_v_instance_id is not null then
      update public.voucher_instances
      set
        redeemed_at = now(),
        order_id = v_order_id
      where id = v_v_instance_id
        and redeemed_at is null;

      get diagnostics v_row_count = row_count;
      if v_row_count <> 1 then
        raise exception 'voucher instance no longer available' using errcode = 'P0001';
      end if;

      update public.orders
      set voucher_instance_id = v_v_instance_id, updated_at = now()
      where id = v_order_id;
    elsif v_v_kind = 'shared' and v_v_batch_id is not null then
      begin
        insert into public.shared_voucher_redemptions (batch_id, public_user_id, order_id)
        values (v_v_batch_id, v_user_id, v_order_id)
        returning id into v_shr_id;
      exception
        when unique_violation then
          raise exception 'voucher redemption conflict' using errcode = 'P0001';
      end;

      update public.orders
      set shared_voucher_redemption_id = v_shr_id, updated_at = now()
      where id = v_order_id;
    end if;
  end if;

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
  values (v_order_id, 'pending'::public.order_status, 'Order placed');

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_cents', v_total_cents::int,
    'discount_cents', v_discount_cents
  );
end;
$$;

comment on function public.place_order(jsonb) is
  'Checkout: PKR delivery; email optional for guests; phone + address required; optional voucher_code.';
