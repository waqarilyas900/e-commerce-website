-- Milestone 1: voucher schema extensions, preview-only RPC, place_order redemption, audit, stats view.

-- ---------------------------------------------------------------------------
-- Batch status + metadata (Phase 1)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'voucher_batch_status') then
    create type public.voucher_batch_status as enum ('draft', 'active', 'paused', 'archived');
  end if;
end;
$$;

comment on type public.voucher_batch_status is 'Campaign lifecycle; only active is redeemable on storefront.';

alter table public.voucher_batches
  add column if not exists status public.voucher_batch_status not null default 'active';

update public.voucher_batches set status = 'active' where status is null;

alter table public.voucher_batches
  add column if not exists campaign_purpose text;

alter table public.voucher_batches
  add column if not exists code_prefix text;

alter table public.voucher_batches
  add column if not exists code_random_length integer
    check (code_random_length is null or (code_random_length >= 4 and code_random_length <= 32));

alter table public.voucher_batches
  add column if not exists max_discount_cents integer
    check (max_discount_cents is null or max_discount_cents >= 0);

alter table public.voucher_batches
  add column if not exists attribution_source text;

comment on column public.voucher_batches.status is 'draft/paused/archived batches do not redeem; active only.';
comment on column public.voucher_batches.campaign_purpose is 'Marketing / ops label (e.g. acquisition, retention).';
comment on column public.voucher_batches.code_prefix is 'Prefix for generated multi codes (Type 2).';
comment on column public.voucher_batches.code_random_length is 'Random segment length for generated codes.';
comment on column public.voucher_batches.max_discount_cents is 'Optional cap on discount in paisa (minor PKR units).';
comment on column public.voucher_batches.attribution_source is 'Optional campaign attribution for exports.';

-- ---------------------------------------------------------------------------
-- Orders: voucher provenance (Phase 1)
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists voucher_instance_id uuid references public.voucher_instances (id) on delete set null;

alter table public.orders
  add column if not exists shared_voucher_redemption_id uuid;

-- FK added after backfill-safe nullable column (redemption row created in same txn as order)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_shared_voucher_redemption_id_fkey'
  ) then
    alter table public.orders
      add constraint orders_shared_voucher_redemption_id_fkey
      foreign key (shared_voucher_redemption_id)
      references public.shared_voucher_redemptions (id)
      on delete set null;
  end if;
end;
$$;

create index if not exists orders_voucher_instance_id_idx on public.orders (voucher_instance_id)
  where voucher_instance_id is not null;

create index if not exists orders_shared_voucher_redemption_id_idx on public.orders (shared_voucher_redemption_id)
  where shared_voucher_redemption_id is not null;

-- ---------------------------------------------------------------------------
-- Audit (Phase 5)
-- ---------------------------------------------------------------------------
create table if not exists public.voucher_batch_audit (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.voucher_batches (id) on delete cascade,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.voucher_batch_audit is 'Append-only log of batch create/update (admin ops traceability).';

create index if not exists voucher_batch_audit_batch_id_idx on public.voucher_batch_audit (batch_id, created_at desc);

alter table public.voucher_batch_audit enable row level security;

create policy "voucher_batch_audit_admin_all"
  on public.voucher_batch_audit for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

grant select, insert on public.voucher_batch_audit to authenticated;

create or replace function public.log_voucher_batch_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.voucher_batch_audit (batch_id, action, detail)
    values (new.id, 'insert', jsonb_build_object('name', new.name, 'status', new.status));
    return new;
  end if;
  if tg_op = 'UPDATE' then
    insert into public.voucher_batch_audit (batch_id, action, detail)
    values (
      new.id,
      'update',
      jsonb_build_object(
        'name', jsonb_build_object('from', old.name, 'to', new.name),
        'status', case when old.status is distinct from new.status
          then jsonb_build_object('from', old.status, 'to', new.status) else null end
      )
    );
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists voucher_batches_audit_trg on public.voucher_batches;
create trigger voucher_batches_audit_trg
  after insert or update on public.voucher_batches
  for each row
  execute procedure public.log_voucher_batch_audit();

-- ---------------------------------------------------------------------------
-- Stats view (Phase 1 + 6 filters)
-- ---------------------------------------------------------------------------
drop view if exists public.voucher_batch_stats;

create view public.voucher_batch_stats as
select
  b.id,
  b.name,
  b.batch_kind,
  b.shared_code,
  b.discount_type,
  b.voucher_amount,
  b.product_scope,
  b.product_ids,
  b.min_order_amount,
  b.valid_from,
  b.valid_until,
  b.created_at,
  b.updated_at,
  b.status,
  b.campaign_purpose,
  b.attribution_source,
  b.code_prefix,
  b.code_random_length,
  b.max_discount_cents,
  case
    when b.batch_kind = 'shared'::public.voucher_batch_kind then 1
    else coalesce(ic.c_total, 0)::int
  end as total_codes,
  case
    when b.batch_kind = 'shared'::public.voucher_batch_kind then coalesce(shr.c_used, 0)::int
    else coalesce(ic.c_used, 0)::int
  end as used_count,
  case
    when b.batch_kind = 'shared'::public.voucher_batch_kind then null::int
    else coalesce(ic.c_avail, 0)::int
  end as available_count,
  case
    when b.batch_kind = 'shared'::public.voucher_batch_kind then null::int
    else coalesce(ic.c_unassigned, 0)::int
  end as unassigned_available_count,
  case
    when b.batch_kind = 'shared'::public.voucher_batch_kind then null::int
    else coalesce(ic.c_assigned_open, 0)::int
  end as assigned_not_redeemed_count
from public.voucher_batches b
left join lateral (
  select
    count(*)::bigint as c_total,
    count(*) filter (where vi.redeemed_at is not null)::bigint as c_used,
    count(*) filter (where vi.redeemed_at is null)::bigint as c_avail,
    count(*) filter (
      where vi.redeemed_at is null and vi.assigned_public_user_id is null
    )::bigint as c_unassigned,
    count(*) filter (
      where vi.redeemed_at is null and vi.assigned_public_user_id is not null
    )::bigint as c_assigned_open
  from public.voucher_instances vi
  where vi.batch_id = b.id
) ic on true
left join lateral (
  select count(*)::bigint as c_used
  from public.shared_voucher_redemptions r
  where r.batch_id = b.id
) shr on true;

comment on view public.voucher_batch_stats is 'Batch listing: shared vs multi counts + campaign metadata.';

grant select on public.voucher_batch_stats to authenticated;

-- ---------------------------------------------------------------------------
-- Core quote logic (preview + place_order); no side effects
-- p_lock: when true, take FOR UPDATE on instance/batch rows for transactional commit
-- ---------------------------------------------------------------------------
create or replace function public._voucher_quote(
  p_public_user_id uuid,
  p_code text,
  p_cart_subtotal_pkr numeric,
  p_cart_product_ids uuid[],
  p_lock boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst public.voucher_instances%rowtype;
  v_batch public.voucher_batches%rowtype;
  v_discount_pkr numeric(12, 2);
  v_discount_cents bigint;
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
    return jsonb_build_object('ok', false, 'error', 'Code required', 'error_code', 'code_required');
  end if;

  if p_public_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated', 'error_code', 'not_authenticated');
  end if;

  -- Multi: instance code
  if p_lock then
    select * into v_inst
    from public.voucher_instances vi
    where vi.code = upper(trim(p_code))
    for update;
  else
    select * into v_inst
    from public.voucher_instances vi
    where vi.code = upper(trim(p_code));
  end if;

  if found then
    if v_inst.redeemed_at is not null then
      return jsonb_build_object('ok', false, 'error', 'This code has already been used', 'error_code', 'already_used');
    end if;

    if v_inst.assigned_public_user_id is not null
       and v_inst.assigned_public_user_id <> p_public_user_id then
      return jsonb_build_object(
        'ok', false,
        'error', 'This code is not assigned to your account',
        'error_code', 'not_assigned'
      );
    end if;

    if p_lock then
      select * into v_batch
      from public.voucher_batches b
      where b.id = v_inst.batch_id
      for update;
    else
      select * into v_batch
      from public.voucher_batches b
      where b.id = v_inst.batch_id;
    end if;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'Voucher campaign missing', 'error_code', 'batch_missing');
    end if;

    if v_batch.batch_kind is distinct from 'multi'::public.voucher_batch_kind then
      return jsonb_build_object('ok', false, 'error', 'Invalid voucher', 'error_code', 'invalid_code');
    end if;

    if v_batch.status is distinct from 'active'::public.voucher_batch_status then
      return jsonb_build_object('ok', false, 'error', 'This promotion is not active', 'error_code', 'batch_inactive');
    end if;

    v_dt := coalesce(
      v_inst.override_discount_type::text,
      v_batch.discount_type::text
    );
    v_amt := coalesce(v_inst.override_voucher_amount, v_batch.voucher_amount);
    v_min := coalesce(v_inst.override_min_order_amount, v_batch.min_order_amount, 0);
    v_vf := coalesce(v_inst.override_valid_from, v_batch.valid_from);
    v_vu := coalesce(v_inst.override_valid_until, v_batch.valid_until);
    v_ps := coalesce(
      v_inst.override_product_scope::text,
      v_batch.product_scope::text,
      'all'
    );

    if v_inst.override_product_scope is not null then
      v_pids := coalesce(v_inst.override_product_ids, '{}');
    else
      v_pids := coalesce(v_batch.product_ids, '{}');
    end if;

    if v_dt is null or v_amt is null or v_vf is null or v_vu is null then
      return jsonb_build_object(
        'ok', false,
        'error', 'This voucher is not active yet. Ask the store to finish configuring this code.',
        'error_code', 'not_configured'
      );
    end if;

    if now() < v_vf or now() > v_vu then
      return jsonb_build_object(
        'ok', false,
        'error', 'This promotion is not valid at this time',
        'error_code', 'not_valid_now'
      );
    end if;

    if p_cart_subtotal_pkr < v_min then
      return jsonb_build_object(
        'ok', false,
        'error', format('Minimum order amount is %s PKR', v_min),
        'error_code', 'min_order_not_met'
      );
    end if;

    if v_dt = 'percentage' and (v_amt <= 0 or v_amt > 100) then
      return jsonb_build_object('ok', false, 'error', 'Invalid discount configuration', 'error_code', 'invalid_config');
    end if;

    if v_ps = 'specific' then
      if coalesce(cardinality(v_pids), 0) < 1 then
        return jsonb_build_object(
          'ok', false,
          'error', 'This voucher is not configured yet. Ask the store to set which products apply.',
          'error_code', 'not_configured'
        );
      end if;
      select exists (
        select 1
        from unnest(coalesce(p_cart_product_ids, '{}'::uuid[])) c(pid)
        where pid = any (v_pids)
      ) into v_has_product;
      if not coalesce(v_has_product, false) then
        return jsonb_build_object(
          'ok', false,
          'error', 'Voucher does not apply to items in your cart',
          'error_code', 'product_not_eligible'
        );
      end if;
    end if;

    if v_dt = 'fixed' then
      v_discount_pkr := least(v_amt, p_cart_subtotal_pkr);
    else
      v_discount_pkr := round(p_cart_subtotal_pkr * (v_amt / 100.0), 2);
    end if;

    if v_discount_pkr <= 0 then
      return jsonb_build_object('ok', false, 'error', 'No discount applicable', 'error_code', 'no_discount');
    end if;

    v_discount_cents := round(v_discount_pkr * 100)::bigint;
    if v_batch.max_discount_cents is not null then
      v_discount_cents := least(v_discount_cents, v_batch.max_discount_cents::bigint);
    end if;

    if v_discount_cents <= 0 then
      return jsonb_build_object('ok', false, 'error', 'No discount applicable', 'error_code', 'no_discount');
    end if;

    return jsonb_build_object(
      'ok', true,
      'discount_cents', v_discount_cents::int,
      'discount_type', v_dt,
      'kind', 'multi',
      'batch_id', v_batch.id,
      'instance_id', v_inst.id
    );
  end if;

  -- Shared code
  if p_lock then
    select * into v_batch
    from public.voucher_batches b
    where b.batch_kind = 'shared'::public.voucher_batch_kind
      and b.shared_code = upper(trim(p_code))
    for update;
  else
    select * into v_batch
    from public.voucher_batches b
    where b.batch_kind = 'shared'::public.voucher_batch_kind
      and b.shared_code = upper(trim(p_code));
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid code', 'error_code', 'invalid_code');
  end if;

  if v_batch.status is distinct from 'active'::public.voucher_batch_status then
    return jsonb_build_object('ok', false, 'error', 'This promotion is not active', 'error_code', 'batch_inactive');
  end if;

  if exists (
    select 1 from public.shared_voucher_redemptions r
    where r.batch_id = v_batch.id and r.public_user_id = p_public_user_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'You have already used this voucher', 'error_code', 'already_used');
  end if;

  if now() < v_batch.valid_from or now() > v_batch.valid_until then
    return jsonb_build_object(
      'ok', false,
      'error', 'This promotion is not valid at this time',
      'error_code', 'not_valid_now'
    );
  end if;

  if p_cart_subtotal_pkr < v_batch.min_order_amount then
    return jsonb_build_object(
      'ok', false,
      'error', format('Minimum order amount is %s PKR', v_batch.min_order_amount),
      'error_code', 'min_order_not_met'
    );
  end if;

  if v_batch.product_scope = 'specific'::public.voucher_product_scope then
    select exists (
      select 1
      from unnest(coalesce(p_cart_product_ids, '{}'::uuid[])) c(pid)
      where pid = any (v_batch.product_ids)
    ) into v_has_product;
    if not coalesce(v_has_product, false) then
      return jsonb_build_object(
        'ok', false,
        'error', 'Voucher does not apply to items in your cart',
        'error_code', 'product_not_eligible'
      );
    end if;
  end if;

  if v_batch.discount_type = 'fixed'::public.voucher_discount_kind then
    v_discount_pkr := least(v_batch.voucher_amount, p_cart_subtotal_pkr);
  else
    v_discount_pkr := round(p_cart_subtotal_pkr * (v_batch.voucher_amount / 100.0), 2);
  end if;

  if v_discount_pkr <= 0 then
    return jsonb_build_object('ok', false, 'error', 'No discount applicable', 'error_code', 'no_discount');
  end if;

  v_discount_cents := round(v_discount_pkr * 100)::bigint;
  if v_batch.max_discount_cents is not null then
    v_discount_cents := least(v_discount_cents, v_batch.max_discount_cents::bigint);
  end if;

  if v_discount_cents <= 0 then
    return jsonb_build_object('ok', false, 'error', 'No discount applicable', 'error_code', 'no_discount');
  end if;

  return jsonb_build_object(
    'ok', true,
    'discount_cents', v_discount_cents::int,
    'discount_type', v_batch.discount_type::text,
    'kind', 'shared',
    'batch_id', v_batch.id
  );
end;
$$;

comment on function public._voucher_quote(uuid, text, numeric, uuid[], boolean) is
  'Internal: validate voucher and return discount in paisa; optional row locks for commit in place_order.';

revoke all on function public._voucher_quote(uuid, text, numeric, uuid[], boolean) from public;

-- ---------------------------------------------------------------------------
-- preview_voucher — storefront quote only (no redemption)
-- ---------------------------------------------------------------------------
create or replace function public.preview_voucher(
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
  v_uid uuid := auth.uid();
  v_public_id uuid;
  v_quote jsonb;
begin
  if p_code is null or trim(p_code) = '' then
    return jsonb_build_object('ok', false, 'error', 'Code required', 'error_code', 'code_required');
  end if;

  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated', 'error_code', 'not_authenticated');
  end if;

  select u.id into v_public_id
  from public.users u
  where u.auth_id = v_uid
  limit 1;

  if v_public_id is null then
    return jsonb_build_object('ok', false, 'error', 'Profile not found', 'error_code', 'profile_not_found');
  end if;

  v_quote := public._voucher_quote(
    v_public_id,
    p_code,
    p_cart_subtotal,
    coalesce(p_cart_product_ids, '{}'::uuid[]),
    false
  );

  return v_quote;
end;
$$;

comment on function public.preview_voucher(text, numeric, uuid[]) is
  'Quote-only voucher validation; does not redeem. Use place_order to commit.';

revoke all on function public.preview_voucher(text, numeric, uuid[]) from public;
grant execute on function public.preview_voucher(text, numeric, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- apply_voucher — alias to preview (legacy name; does not redeem)
-- ---------------------------------------------------------------------------
create or replace function public.apply_voucher(
  p_code text,
  p_cart_subtotal numeric,
  p_cart_product_ids uuid[]
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.preview_voucher(p_code, p_cart_subtotal, p_cart_product_ids);
$$;

comment on function public.apply_voucher(text, numeric, uuid[]) is
  'Deprecated alias for preview_voucher; does not redeem codes.';

-- ---------------------------------------------------------------------------
-- place_order — authoritative cart + voucher redemption in one transaction
-- ---------------------------------------------------------------------------
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
  if v_email is null or position('@' in v_email) < 2 then
    return jsonb_build_object('ok', false, 'error', 'Valid email is required', 'error_code', 'validation');
  end if;
  if v_first is null or v_last is null then
    return jsonb_build_object('ok', false, 'error', 'First and last name are required', 'error_code', 'validation');
  end if;
  if v_phone is null then
    return jsonb_build_object('ok', false, 'error', 'Phone is required', 'error_code', 'validation');
  end if;
  if v_street is null or v_city is null or v_postal is null or v_province is null then
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
      greatest(
        0,
        coalesce(inv.quantity_on_hand, 0) - coalesce(inv.quantity_reserved, 0)
      )::int
    into v_sku, v_opts, v_price, v_pname, v_product_id, v_avail
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

  -- Voucher (server-side subtotal PKR; ignores client-submitted discount)
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
    v_email,
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

  -- Redeem voucher after order row exists (FK to order on instance / redemption)
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
  'Checkout: PKR delivery; optional voucher_code redeems in same transaction; snapshots include voucher summary.';
