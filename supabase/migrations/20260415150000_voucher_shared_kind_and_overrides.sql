-- Shared single code (all customers, once each) vs multi unique codes (overrides per assignment).

alter table public.voucher_batches
  add column if not exists batch_kind text not null default 'multi'
    check (batch_kind in ('shared', 'multi'));

alter table public.voucher_batches
  add column if not exists shared_code text;

update public.voucher_batches set batch_kind = 'multi' where batch_kind is null;

alter table public.voucher_batches
  drop constraint if exists voucher_batches_kind_code_ck;

alter table public.voucher_batches
  add constraint voucher_batches_kind_code_ck check (
    (batch_kind = 'multi' and shared_code is null)
    or (batch_kind = 'shared' and shared_code is not null)
  );

drop index if exists voucher_batches_shared_code_upper_idx;
create unique index voucher_batches_shared_code_upper_idx
  on public.voucher_batches (upper(trim(shared_code)))
  where shared_code is not null;

-- Per-code overrides (filled when assigning a multi batch code to a customer)
alter table public.voucher_instances
  add column if not exists override_discount_type text
    check (override_discount_type is null or override_discount_type in ('fixed', 'percentage'));

alter table public.voucher_instances
  add column if not exists override_voucher_amount numeric(12, 2);

alter table public.voucher_instances
  add column if not exists override_min_order_amount numeric(12, 2);

alter table public.voucher_instances
  add column if not exists override_valid_from timestamptz;

alter table public.voucher_instances
  add column if not exists override_valid_until timestamptz;

alter table public.voucher_instances
  add column if not exists override_product_scope text
    check (override_product_scope is null or override_product_scope in ('all', 'specific'));

alter table public.voucher_instances
  add column if not exists override_product_ids uuid[];

create table if not exists public.shared_voucher_redemptions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.voucher_batches (id) on delete cascade,
  public_user_id uuid not null references public.users (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  order_id uuid references public.orders (id) on delete set null,
  constraint shared_voucher_redemptions_batch_user_key unique (batch_id, public_user_id)
);

create index if not exists shared_voucher_redemptions_batch_id_idx
  on public.shared_voucher_redemptions (batch_id);

comment on table public.shared_voucher_redemptions is
  'One row per customer for shared_code vouchers (each customer redeems at most once).';

alter table public.shared_voucher_redemptions enable row level security;

create policy "shared_voucher_redemptions_admin_all"
  on public.shared_voucher_redemptions for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "shared_voucher_redemptions_select_own"
  on public.shared_voucher_redemptions for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = shared_voucher_redemptions.public_user_id
        and u.auth_id = auth.uid()
    )
  );

create or replace function public.normalize_voucher_batch_shared_code()
returns trigger
language plpgsql
as $$
begin
  if new.shared_code is not null then
    new.shared_code := upper(trim(new.shared_code));
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists voucher_batches_normalize_shared_code on public.voucher_batches;
create trigger voucher_batches_normalize_shared_code
  before insert or update of shared_code on public.voucher_batches
  for each row
  execute procedure public.normalize_voucher_batch_shared_code();

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
  case
    when b.batch_kind = 'shared' then 1
    else coalesce(ic.c_total, 0)::int
  end as total_codes,
  case
    when b.batch_kind = 'shared' then coalesce(shr.c_used, 0)::int
    else coalesce(ic.c_used, 0)::int
  end as used_count,
  case
    when b.batch_kind = 'shared' then null::int
    else coalesce(ic.c_avail, 0)::int
  end as available_count,
  case
    when b.batch_kind = 'shared' then null::int
    else coalesce(ic.c_unassigned, 0)::int
  end as unassigned_available_count,
  case
    when b.batch_kind = 'shared' then null::int
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

comment on view public.voucher_batch_stats is 'Batch listing: shared vs multi counts.';

grant select on public.voucher_batch_stats to authenticated;

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

  -- 1) Multi: unique instance codes
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
    v_min := coalesce(v_inst.override_min_order_amount, v_batch.min_order_amount);
    v_vf := coalesce(v_inst.override_valid_from, v_batch.valid_from);
    v_vu := coalesce(v_inst.override_valid_until, v_batch.valid_until);
    v_ps := coalesce(v_inst.override_product_scope, v_batch.product_scope);
    if v_inst.override_product_scope is not null then
      v_pids := coalesce(v_inst.override_product_ids, '{}');
    else
      v_pids := v_batch.product_ids;
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

  -- 2) Shared: one code for all customers, once per customer
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
  'Multi: redeems instance (optional per-code overrides). Shared: one redemption per customer per batch.';

revoke all on function public.apply_voucher(text, numeric, uuid[]) from public;
grant execute on function public.apply_voucher(text, numeric, uuid[]) to authenticated;
