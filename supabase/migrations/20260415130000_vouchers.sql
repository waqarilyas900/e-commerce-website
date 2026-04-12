-- Vouchers: admin-defined codes; redemptions tracked per public.users row.

create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_type text not null check (discount_type in ('fixed', 'percentage')),
  voucher_amount numeric(12, 2) not null check (voucher_amount > 0),
  product_scope text not null default 'all' check (product_scope in ('all', 'specific')),
  product_ids uuid[] not null default '{}',
  min_order_amount numeric(12, 2) not null default 0 check (min_order_amount >= 0),
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  assigned_public_user_id uuid references public.users (id) on delete set null,
  single_use_globally boolean not null default false,
  is_exhausted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vouchers_code_key unique (code),
  constraint vouchers_valid_range check (valid_until > valid_from),
  constraint vouchers_percent_range check (
    discount_type <> 'percentage' or (voucher_amount > 0 and voucher_amount <= 100)
  ),
  constraint vouchers_product_ids_when_specific check (
    product_scope <> 'specific' or cardinality(product_ids) >= 1
  ),
  constraint vouchers_code_alnum check (code ~ '^[A-Za-z0-9]+$')
);

create index if not exists vouchers_code_lower_idx on public.vouchers (lower(code));
create index if not exists vouchers_valid_idx on public.vouchers (valid_from, valid_until);

comment on table public.vouchers is 'Discount vouchers; code is unique alphanumeric (stored uppercased).';

create table if not exists public.voucher_redemptions (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.vouchers (id) on delete cascade,
  public_user_id uuid not null references public.users (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  redeemed_at timestamptz not null default now(),
  constraint voucher_redemptions_one_per_user unique (voucher_id, public_user_id)
);

create index if not exists voucher_redemptions_voucher_id_idx on public.voucher_redemptions (voucher_id);
create index if not exists voucher_redemptions_user_id_idx on public.voucher_redemptions (public_user_id);

comment on table public.voucher_redemptions is 'Records each voucher use; enforces one redemption per user per voucher.';

create or replace function public.normalize_voucher_code()
returns trigger
language plpgsql
as $$
begin
  new.code := upper(trim(new.code));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists vouchers_normalize_code on public.vouchers;
create trigger vouchers_normalize_code
  before insert or update of code on public.vouchers
  for each row
  execute procedure public.normalize_voucher_code();

create or replace function public.voucher_mark_exhausted_after_redemption()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.vouchers v
  set
    is_exhausted = true,
    updated_at = now()
  where v.id = new.voucher_id
    and (
      v.single_use_globally
      or v.assigned_public_user_id is not null
    );
  return new;
end;
$$;

drop trigger if exists voucher_redemptions_mark_exhausted on public.voucher_redemptions;
create trigger voucher_redemptions_mark_exhausted
  after insert on public.voucher_redemptions
  for each row
  execute procedure public.voucher_mark_exhausted_after_redemption();

alter table public.vouchers enable row level security;
alter table public.voucher_redemptions enable row level security;

-- Admins: full access
create policy "vouchers_select_admin"
  on public.vouchers for select
  to authenticated
  using (public.is_active_admin());

create policy "vouchers_insert_admin"
  on public.vouchers for insert
  to authenticated
  with check (public.is_active_admin());

create policy "vouchers_update_admin"
  on public.vouchers for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "vouchers_delete_admin"
  on public.vouchers for delete
  to authenticated
  using (public.is_active_admin());

create policy "voucher_redemptions_select_admin"
  on public.voucher_redemptions for select
  to authenticated
  using (public.is_active_admin());

create policy "voucher_redemptions_select_own"
  on public.voucher_redemptions for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = voucher_redemptions.public_user_id
        and u.auth_id = auth.uid()
    )
  );

-- Authenticated customers apply via RPC only (no direct insert)

-- Apply voucher at checkout: validates rules and inserts one redemption row.
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
  v_row public.vouchers%rowtype;
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

  select * into v_row
  from public.vouchers v
  where v.code = upper(trim(p_code))
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid code');
  end if;

  if v_row.is_exhausted then
    return jsonb_build_object('ok', false, 'error', 'This voucher is no longer available');
  end if;

  if now() < v_row.valid_from or now() > v_row.valid_until then
    return jsonb_build_object('ok', false, 'error', 'Voucher is not valid at this time');
  end if;

  if p_cart_subtotal < v_row.min_order_amount then
    return jsonb_build_object(
      'ok', false,
      'error',
      format('Minimum order amount is %s', v_row.min_order_amount)
    );
  end if;

  if v_row.assigned_public_user_id is not null
     and v_row.assigned_public_user_id <> v_public_id then
    return jsonb_build_object('ok', false, 'error', 'This voucher is not available for your account');
  end if;

  if exists (
    select 1 from public.voucher_redemptions r
    where r.voucher_id = v_row.id and r.public_user_id = v_public_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'You have already used this voucher');
  end if;

  if v_row.single_use_globally and exists (
    select 1 from public.voucher_redemptions r where r.voucher_id = v_row.id
  ) then
    return jsonb_build_object('ok', false, 'error', 'This voucher has already been used');
  end if;

  if v_row.product_scope = 'specific' then
    select exists (
      select 1
      from unnest(coalesce(p_cart_product_ids, '{}'::uuid[])) c(pid)
      where pid = any (v_row.product_ids)
    ) into v_has_product;
    if not coalesce(v_has_product, false) then
      return jsonb_build_object('ok', false, 'error', 'Voucher does not apply to items in your cart');
    end if;
  end if;

  if v_row.discount_type = 'fixed' then
    v_discount := least(v_row.voucher_amount, p_cart_subtotal);
  else
    v_discount := round(p_cart_subtotal * (v_row.voucher_amount / 100.0), 2);
  end if;

  if v_discount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'No discount applicable');
  end if;

  insert into public.voucher_redemptions (voucher_id, public_user_id)
  values (v_row.id, v_public_id);

  return jsonb_build_object(
    'ok', true,
    'voucher_id', v_row.id,
    'discount_amount', v_discount,
    'discount_type', v_row.discount_type
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Voucher already applied');
end;
$$;

comment on function public.apply_voucher(text, numeric, uuid[]) is
  'Validates and redeems a voucher for the current user; inserts voucher_redemptions.';

revoke all on function public.apply_voucher(text, numeric, uuid[]) from public;
grant execute on function public.apply_voucher(text, numeric, uuid[]) to authenticated;
