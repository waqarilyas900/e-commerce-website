-- Multi (batch) campaigns may omit batch-level discount & validity; set per code via overrides when assigning.
-- Shared campaigns must still define full rules on the batch.

alter table public.voucher_batches
  alter column discount_type drop not null;

alter table public.voucher_batches
  alter column voucher_amount drop not null;

alter table public.voucher_batches
  alter column valid_from drop not null;

alter table public.voucher_batches
  alter column valid_until drop not null;

alter table public.voucher_batches
  drop constraint if exists voucher_batches_valid_range;

alter table public.voucher_batches
  add constraint voucher_batches_valid_range check (
    (valid_from is null and valid_until is null)
    or (valid_from is not null and valid_until is not null and valid_until > valid_from)
  );

alter table public.voucher_batches
  drop constraint if exists voucher_batches_percent_range;

-- When discount is set, amount must match type; both may be null for deferred multi batches.
alter table public.voucher_batches
  add constraint voucher_batches_discount_pair check (
    (discount_type is null and voucher_amount is null)
    or (
      discount_type = 'percentage'
      and voucher_amount is not null
      and voucher_amount > 0
      and voucher_amount <= 100
    )
    or (
      discount_type = 'fixed'
      and voucher_amount is not null
      and voucher_amount > 0
    )
  );

alter table public.voucher_batches
  drop constraint if exists voucher_batches_product_ids_when_specific;

alter table public.voucher_batches
  add constraint voucher_batches_product_ids_when_specific check (
    product_scope <> 'specific'
    or cardinality(product_ids) >= 1
  );

-- Shared vouchers always require batch-level rules.
alter table public.voucher_batches
  drop constraint if exists voucher_batches_shared_requires_rules;

alter table public.voucher_batches
  add constraint voucher_batches_shared_requires_rules check (
    batch_kind is distinct from 'shared'
    or (
      discount_type is not null
      and voucher_amount is not null
      and valid_from is not null
      and valid_until is not null
    )
  );

comment on table public.voucher_batches is
  'Campaign rules: multi batches may omit discount/validity (set per instance). Shared batches require full rules.';

-- Redemption: effective rules = overrides coalesced with batch; all four core fields must be non-null to redeem.
create or replace function public.apply_voucher(
  p_code text,
  p_cart_subtotal numeric,
  p_cart_product_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_public_id uuid;
  v_inst public.voucher_instances%rowtype;
  v_batch public.voucher_batches%rowtype;
  v_discount numeric(12, 2);
  v_has_product boolean;
  v_dt text;
  v_amt numeric(12, 2);
  v_min numeric(12, 2);
  v_vf timestamptz;
  v_vu timestamptz;
  v_ps text;
  v_pids uuid[];
begin
  if p_code is null or trim(p_code) = '' then
    return jsonb_build_object('ok', false, 'error', 'Code required');
  end if;

  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select u.id into v_public_id
  from public.users u
  where u.auth_id = v_uid
  limit 1;

  if v_public_id is null then
    return jsonb_build_object('ok', false, 'error', 'Profile not found');
  end if;

  select * into v_inst
  from public.voucher_instances vi
  where vi.code = upper(trim(p_code))
  for update;

  if found then
    if v_inst.redeemed_at is not null then
      return jsonb_build_object('ok', false, 'error', 'This code has already been used');
    end if;

    if v_inst.assigned_public_user_id is not null
       and v_inst.assigned_public_user_id <> v_public_id then
      return jsonb_build_object('ok', false, 'error', 'This code is not assigned to your account');
    end if;

    select * into v_batch
    from public.voucher_batches b
    where b.id = v_inst.batch_id
    for update;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'Voucher campaign missing');
    end if;

    if v_batch.batch_kind <> 'multi' then
      return jsonb_build_object('ok', false, 'error', 'Invalid voucher');
    end if;

    v_dt := coalesce(v_inst.override_discount_type, v_batch.discount_type);
    v_amt := coalesce(v_inst.override_voucher_amount, v_batch.voucher_amount);
    v_min := coalesce(v_inst.override_min_order_amount, v_batch.min_order_amount, 0);
    v_vf := coalesce(v_inst.override_valid_from, v_batch.valid_from);
    v_vu := coalesce(v_inst.override_valid_until, v_batch.valid_until);
    v_ps := coalesce(v_inst.override_product_scope, v_batch.product_scope, 'all');

    if v_inst.override_product_scope is not null then
      v_pids := coalesce(v_inst.override_product_ids, '{}');
    else
      v_pids := coalesce(v_batch.product_ids, '{}');
    end if;

    if v_dt is null or v_amt is null or v_vf is null or v_vu is null then
      return jsonb_build_object(
        'ok', false,
        'error',
        'This voucher is not active yet. Ask the store to finish configuring this code.'
      );
    end if;

    if now() < v_vf or now() > v_vu then
      return jsonb_build_object('ok', false, 'error', 'This promotion is not valid at this time');
    end if;

    if p_cart_subtotal < v_min then
      return jsonb_build_object(
        'ok', false,
        'error',
        format('Minimum order amount is %s', v_min)
      );
    end if;

    if v_dt = 'percentage' and (v_amt <= 0 or v_amt > 100) then
      return jsonb_build_object('ok', false, 'error', 'Invalid discount configuration');
    end if;

    if v_ps = 'specific' then
      if coalesce(cardinality(v_pids), 0) < 1 then
        return jsonb_build_object(
          'ok', false,
          'error',
          'This voucher is not configured yet. Ask the store to set which products apply.'
        );
      end if;
      select exists (
        select 1
        from unnest(coalesce(p_cart_product_ids, '{}'::uuid[])) c(pid)
        where pid = any (v_pids)
      ) into v_has_product;
      if not coalesce(v_has_product, false) then
        return jsonb_build_object('ok', false, 'error', 'Voucher does not apply to items in your cart');
      end if;
    end if;

    if v_dt = 'fixed' then
      v_discount := least(v_amt, p_cart_subtotal);
    else
      v_discount := round(p_cart_subtotal * (v_amt / 100.0), 2);
    end if;

    if v_discount <= 0 then
      return jsonb_build_object('ok', false, 'error', 'No discount applicable');
    end if;

    update public.voucher_instances
    set redeemed_at = now()
    where id = v_inst.id;

    return jsonb_build_object(
      'ok', true,
      'voucher_instance_id', v_inst.id,
      'batch_id', v_batch.id,
      'discount_amount', v_discount,
      'discount_type', v_dt
    );
  end if;

  select * into v_batch
  from public.voucher_batches b
  where b.batch_kind = 'shared'
    and b.shared_code = upper(trim(p_code))
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid code');
  end if;

  if exists (
    select 1 from public.shared_voucher_redemptions r
    where r.batch_id = v_batch.id and r.public_user_id = v_public_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'You have already used this voucher');
  end if;

  if now() < v_batch.valid_from or now() > v_batch.valid_until then
    return jsonb_build_object('ok', false, 'error', 'This promotion is not valid at this time');
  end if;

  if p_cart_subtotal < v_batch.min_order_amount then
    return jsonb_build_object(
      'ok', false,
      'error',
      format('Minimum order amount is %s', v_batch.min_order_amount)
    );
  end if;

  if v_batch.product_scope = 'specific' then
    select exists (
      select 1
      from unnest(coalesce(p_cart_product_ids, '{}'::uuid[])) c(pid)
      where pid = any (v_batch.product_ids)
    ) into v_has_product;
    if not coalesce(v_has_product, false) then
      return jsonb_build_object('ok', false, 'error', 'Voucher does not apply to items in your cart');
    end if;
  end if;

  if v_batch.discount_type = 'fixed' then
    v_discount := least(v_batch.voucher_amount, p_cart_subtotal);
  else
    v_discount := round(p_cart_subtotal * (v_batch.voucher_amount / 100.0), 2);
  end if;

  if v_discount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'No discount applicable');
  end if;

  insert into public.shared_voucher_redemptions (batch_id, public_user_id)
  values (v_batch.id, v_public_id);

  return jsonb_build_object(
    'ok', true,
    'batch_id', v_batch.id,
    'discount_amount', v_discount,
    'discount_type', v_batch.discount_type,
    'voucher_kind', 'shared'
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Could not apply voucher');
end;
$$;

comment on function public.apply_voucher(text, numeric, uuid[]) is
  'Multi: batch rules optional; overrides must complete effective rules. Shared: batch rules required.';
