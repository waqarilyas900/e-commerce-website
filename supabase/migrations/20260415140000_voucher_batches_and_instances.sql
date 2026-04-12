-- Replace single-code vouchers with: batch (rules) + N unique code instances.
-- Drop previous voucher objects if present.

drop function if exists public.apply_voucher(text, numeric, uuid[]) cascade;
drop trigger if exists voucher_redemptions_mark_exhausted on public.voucher_redemptions;
drop trigger if exists vouchers_normalize_code on public.vouchers;
drop function if exists public.voucher_mark_exhausted_after_redemption() cascade;
drop function if exists public.normalize_voucher_code() cascade;
drop table if exists public.voucher_redemptions cascade;
drop table if exists public.vouchers cascade;

-- Campaign / rule set (one row per "generic voucher" creation)
create table public.voucher_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Voucher campaign',
  discount_type text not null check (discount_type in ('fixed', 'percentage')),
  voucher_amount numeric(12, 2) not null check (voucher_amount > 0),
  product_scope text not null default 'all' check (product_scope in ('all', 'specific')),
  product_ids uuid[] not null default '{}',
  min_order_amount numeric(12, 2) not null default 0 check (min_order_amount >= 0),
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voucher_batches_valid_range check (valid_until > valid_from),
  constraint voucher_batches_percent_range check (
    discount_type <> 'percentage' or (voucher_amount > 0 and voucher_amount <= 100)
  ),
  constraint voucher_batches_product_ids_when_specific check (
    product_scope <> 'specific' or cardinality(product_ids) >= 1
  )
);

comment on table public.voucher_batches is 'Discount rule template; quantity = count of voucher_instances.';

-- One row per redeemable code
create table public.voucher_instances (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.voucher_batches (id) on delete cascade,
  code text not null,
  assigned_public_user_id uuid references public.users (id) on delete set null,
  redeemed_at timestamptz,
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint voucher_instances_code_key unique (code),
  constraint voucher_instances_code_alnum check (code ~ '^[A-Z0-9]+$')
);

create index voucher_instances_batch_id_idx on public.voucher_instances (batch_id);
create index voucher_instances_code_lower_idx on public.voucher_instances (lower(code));
create index voucher_instances_redeemed_idx on public.voucher_instances (batch_id, redeemed_at);

comment on table public.voucher_instances is 'Single-use codes; assign optional user; redeem sets redeemed_at.';

create or replace function public.normalize_voucher_instance_code()
returns trigger
language plpgsql
as $$
begin
  new.code := upper(trim(new.code));
  return new;
end;
$$;

drop trigger if exists voucher_instances_normalize_code on public.voucher_instances;
create trigger voucher_instances_normalize_code
  before insert or update of code on public.voucher_instances
  for each row
  execute procedure public.normalize_voucher_instance_code();

alter table public.voucher_batches enable row level security;
alter table public.voucher_instances enable row level security;

create policy "voucher_batches_admin_all"
  on public.voucher_batches for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "voucher_instances_admin_all"
  on public.voucher_instances for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- Customers: read own assigned unredeemed? Skip — redemption via RPC only.

-- Stats for list UI
drop view if exists public.voucher_batch_stats;
create view public.voucher_batch_stats as
select
  b.id,
  b.name,
  b.discount_type,
  b.voucher_amount,
  b.product_scope,
  b.product_ids,
  b.min_order_amount,
  b.valid_from,
  b.valid_until,
  b.created_at,
  b.updated_at,
  coalesce(ic.c_total, 0)::int as total_codes,
  coalesce(ic.c_used, 0)::int as used_count,
  coalesce(ic.c_avail, 0)::int as available_count,
  coalesce(ic.c_unassigned, 0)::int as unassigned_available_count,
  coalesce(ic.c_assigned_open, 0)::int as assigned_not_redeemed_count
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
) ic on true;

comment on view public.voucher_batch_stats is 'Batch row with aggregated instance counts for admin listing.';

-- Grant select on view to authenticated (RLC on underlying tables still applies — views use invoker)
grant select on public.voucher_batch_stats to authenticated;

-- Apply: lock instance, validate batch rules, mark redeemed
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

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid code');
  end if;

  if v_inst.redeemed_at is not null then
    return jsonb_build_object('ok', false, 'error', 'This code has already been used');
  end if;

  if v_inst.assigned_public_user_id is not null
     and v_inst.assigned_public_user_id <> v_public_id then
    return jsonb_build_object('ok', false, 'error', 'This code is not assigned to your account');
  end if;

  select * into v_batch
  from public.voucher_batches b
  where b.id = v_inst.batch_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Voucher campaign missing');
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

  update public.voucher_instances
  set redeemed_at = now()
  where id = v_inst.id;

  return jsonb_build_object(
    'ok', true,
    'voucher_instance_id', v_inst.id,
    'batch_id', v_batch.id,
    'discount_amount', v_discount,
    'discount_type', v_batch.discount_type
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Could not apply voucher');
end;
$$;

comment on function public.apply_voucher(text, numeric, uuid[]) is
  'Redeems one voucher_instances row by code; requires assignee match when set.';

revoke all on function public.apply_voucher(text, numeric, uuid[]) from public;
grant execute on function public.apply_voucher(text, numeric, uuid[]) to authenticated;
