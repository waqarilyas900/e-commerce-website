-- Strongly typed domain values: orders, payments, catalog, vouchers, reviews, staff, assets, sizes, auth.
-- Replaces prior text + CHECK patterns where the value set is fixed and app-wide.

-- ---------------------------------------------------------------------------
-- Views that depend on columns we re-type — drop first, recreate later
-- ---------------------------------------------------------------------------
drop view if exists public.profiles;
drop view if exists public.voucher_batch_stats;

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
create type public.order_status as enum (
  'pending',
  'confirmed',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

comment on type public.order_status is
  'Order lifecycle; new orders start as pending (place_order).';

create type public.payment_method as enum (
  'cod',
  'card',
  'bank_transfer',
  'wallet'
);

comment on type public.payment_method is
  'Checkout payment channel; default cod for cash on delivery.';

create type public.review_moderation_status as enum (
  'pending',
  'approved',
  'rejected'
);

comment on type public.review_moderation_status is
  'Storefront review moderation; only approved shown publicly (RLS).';

create type public.product_status as enum (
  'draft',
  'active'
);

comment on type public.product_status is 'Catalog visibility; only active is public.';

create type public.admin_status as enum (
  'active',
  'inactive'
);

comment on type public.admin_status is 'Admin panel access; is_active_admin() requires active.';

create type public.order_discount_type as enum (
  'percent',
  'fixed'
);

comment on type public.order_discount_type is 'Legacy cart/order discounts table (public.discounts).';

create type public.voucher_discount_kind as enum (
  'fixed',
  'percentage'
);

comment on type public.voucher_discount_kind is 'Voucher batch/instance discount mode.';

create type public.voucher_product_scope as enum (
  'all',
  'specific'
);

comment on type public.voucher_product_scope is 'Whether a voucher applies store-wide or to listed products.';

create type public.voucher_batch_kind as enum (
  'shared',
  'multi'
);

comment on type public.voucher_batch_kind is 'Shared single code vs multi unique instance codes.';

create type public.product_asset_kind as enum (
  'image',
  'video'
);

create type public.size_value_kind as enum (
  'numeric',
  'text'
);

comment on type public.size_value_kind is 'Size option semantics for variant UI.';

create type public.auth_signup_provider as enum (
  'unknown',
  'email',
  'google',
  'apple',
  'github',
  'phone',
  'linkedin',
  'twitter',
  'discord',
  'twitch',
  'facebook',
  'gitlab',
  'bitbucket',
  'slack',
  'spotify',
  'azure',
  'keycloak',
  'notion',
  'workos',
  'other'
);

comment on type public.auth_signup_provider is
  'First auth identity provider at signup; unknown until linked; unlisted OAuth map to other.';

-- Map auth.identities.provider (text) → enum for triggers and backfills
create or replace function public.map_identity_provider_to_enum(p text)
returns public.auth_signup_provider
language sql
immutable
as $$
  select case lower(nullif(trim(p), ''))
    when '' then 'unknown'::public.auth_signup_provider
    when 'email' then 'email'::public.auth_signup_provider
    when 'google' then 'google'::public.auth_signup_provider
    when 'apple' then 'apple'::public.auth_signup_provider
    when 'github' then 'github'::public.auth_signup_provider
    when 'phone' then 'phone'::public.auth_signup_provider
    when 'linkedin' then 'linkedin'::public.auth_signup_provider
    when 'twitter' then 'twitter'::public.auth_signup_provider
    when 'discord' then 'discord'::public.auth_signup_provider
    when 'twitch' then 'twitch'::public.auth_signup_provider
    when 'facebook' then 'facebook'::public.auth_signup_provider
    when 'gitlab' then 'gitlab'::public.auth_signup_provider
    when 'bitbucket' then 'bitbucket'::public.auth_signup_provider
    when 'slack' then 'slack'::public.auth_signup_provider
    when 'spotify' then 'spotify'::public.auth_signup_provider
    when 'azure' then 'azure'::public.auth_signup_provider
    when 'keycloak' then 'keycloak'::public.auth_signup_provider
    when 'notion' then 'notion'::public.auth_signup_provider
    when 'workos' then 'workos'::public.auth_signup_provider
    else 'other'::public.auth_signup_provider
  end;
$$;

comment on function public.map_identity_provider_to_enum(text) is
  'Maps Supabase auth.identities.provider string to auth_signup_provider; unknown → unknown, else other.';

-- ---------------------------------------------------------------------------
-- Drop CHECK constraints that block type changes
-- ---------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_status_check;

alter table public.reviews drop constraint if exists reviews_status_check;

alter table public.products drop constraint if exists products_status_check;

alter table public.admins drop constraint if exists admins_status_check;

alter table public.discounts drop constraint if exists discounts_discount_type_check;

alter table public.product_assets drop constraint if exists product_assets_kind_check;

alter table public.sizes drop constraint if exists sizes_size_type_check;

alter table public.voucher_batches drop constraint if exists voucher_batches_kind_code_ck;
alter table public.voucher_batches drop constraint if exists voucher_batches_discount_pair;
alter table public.voucher_batches drop constraint if exists voucher_batches_percent_range;
alter table public.voucher_batches drop constraint if exists voucher_batches_valid_range;
alter table public.voucher_batches drop constraint if exists voucher_batches_product_ids_when_specific;
alter table public.voucher_batches drop constraint if exists voucher_batches_shared_requires_rules;
-- Inline column CHECKs from 20260415140000 / 20260415150000 (name pattern {table}_{column}_check)
alter table public.voucher_batches drop constraint if exists voucher_batches_discount_type_check;
alter table public.voucher_batches drop constraint if exists voucher_batches_product_scope_check;
alter table public.voucher_batches drop constraint if exists voucher_batches_batch_kind_check;

alter table public.voucher_instances drop constraint if exists voucher_instances_override_discount_type_check;
alter table public.voucher_instances drop constraint if exists voucher_instances_override_product_scope_check;

-- ---------------------------------------------------------------------------
-- Alter columns → enums (existing rows cast by label)
-- ---------------------------------------------------------------------------
alter table public.users
  alter column signup_provider drop default;

alter table public.users
  alter column signup_provider type public.auth_signup_provider
  using (public.map_identity_provider_to_enum(signup_provider::text));

alter table public.users
  alter column signup_provider set default 'unknown'::public.auth_signup_provider;

comment on column public.users.signup_provider is
  'public.auth_signup_provider; first identity at signup (see map_identity_provider_to_enum).';

-- Drop text defaults before enum conversion (PG cannot cast default automatically; SQLSTATE 42804).
-- Single ALTER TABLE keeps DROP DEFAULT + TYPE + SET DEFAULT in one step (avoids per-statement issues).
alter table public.orders alter column payment_method drop default;

alter table public.orders
  alter column status drop default,
  alter column status type public.order_status using (status::public.order_status),
  alter column status set default 'pending'::public.order_status;

alter table public.orders
  alter column payment_method type public.payment_method
  using (
    case trim(lower(payment_method::text))
      when 'cod' then 'cod'::public.payment_method
      when 'card' then 'card'::public.payment_method
      when 'bank_transfer' then 'bank_transfer'::public.payment_method
      when 'wallet' then 'wallet'::public.payment_method
      else 'cod'::public.payment_method
    end
  );

alter table public.orders
  alter column payment_method set default 'cod'::public.payment_method;

alter table public.order_status_history
  alter column status type public.order_status
  using (status::public.order_status);

-- RLS policies reference reviews.status — must drop before ALTER TYPE (SQLSTATE 0A000)
drop policy if exists "reviews_select_approved_or_admin" on public.reviews;

alter table public.reviews alter column status drop default;

alter table public.reviews
  alter column status type public.review_moderation_status
  using (status::public.review_moderation_status);

alter table public.reviews
  alter column status set default 'pending'::public.review_moderation_status;

create policy "reviews_select_approved_or_admin"
  on public.reviews for select
  to anon, authenticated
  using (
    public.is_active_admin()
    or status = 'approved'::public.review_moderation_status
    or exists (
      select 1 from public.users u
      where u.id = reviews.user_id
        and u.auth_id = auth.uid()
    )
  );

-- Policies that reference products.status — must drop before ALTER TYPE
drop policy if exists "product_assets_select_public" on public.product_assets;
drop policy if exists "inventory_select_public" on public.inventory;
drop policy if exists "products_select_public_or_admin" on public.products;
drop policy if exists "product_variants_select_public_or_admin" on public.product_variants;
drop policy if exists "product_collections_select_public_or_admin" on public.product_collections;

alter table public.products alter column status drop default;

alter table public.products
  alter column status type public.product_status
  using (status::public.product_status);

alter table public.products
  alter column status set default 'draft'::public.product_status;

create policy "products_select_public_or_admin"
  on public.products for select
  to anon, authenticated
  using (status = 'active'::public.product_status or public.is_active_admin());

create policy "product_variants_select_public_or_admin"
  on public.product_variants for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and (p.status = 'active'::public.product_status or public.is_active_admin())
    )
  );

create policy "product_assets_select_public"
  on public.product_assets for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_assets.product_id
        and (p.status = 'active'::public.product_status or public.is_active_admin())
    )
  );

create policy "inventory_select_public"
  on public.inventory for select
  to anon, authenticated
  using (
    public.is_active_admin()
    or exists (
      select 1
      from public.product_variants pv
      join public.products pr on pr.id = pv.product_id
      where pv.id = inventory.product_variant_id
        and pr.status = 'active'::public.product_status
    )
  );

create policy "product_collections_select_public_or_admin"
  on public.product_collections for select
  to anon, authenticated
  using (
    public.is_active_admin()
    or exists (
      select 1 from public.products p
      where p.id = product_collections.product_id
        and p.status = 'active'::public.product_status
    )
  );

alter table public.admins alter column status drop default;

alter table public.admins
  alter column status type public.admin_status
  using (status::public.admin_status);

alter table public.admins
  alter column status set default 'active'::public.admin_status;

alter table public.discounts
  alter column discount_type type public.order_discount_type
  using (discount_type::public.order_discount_type);

alter table public.product_assets alter column kind drop default;

alter table public.product_assets
  alter column kind type public.product_asset_kind
  using (kind::public.product_asset_kind);

alter table public.product_assets
  alter column kind set default 'image'::public.product_asset_kind;

alter table public.sizes alter column size_type drop default;

alter table public.sizes
  alter column size_type type public.size_value_kind
  using (size_type::public.size_value_kind);

alter table public.sizes
  alter column size_type set default 'text'::public.size_value_kind;

alter table public.voucher_batches alter column product_scope drop default;
alter table public.voucher_batches alter column batch_kind drop default;

alter table public.voucher_batches
  alter column discount_type type public.voucher_discount_kind
  using (discount_type::public.voucher_discount_kind);

alter table public.voucher_batches
  alter column product_scope type public.voucher_product_scope
  using (product_scope::public.voucher_product_scope);

alter table public.voucher_batches
  alter column product_scope set default 'all'::public.voucher_product_scope;

alter table public.voucher_batches
  alter column batch_kind type public.voucher_batch_kind
  using (batch_kind::public.voucher_batch_kind);

alter table public.voucher_batches
  alter column batch_kind set default 'multi'::public.voucher_batch_kind;

alter table public.voucher_instances
  alter column override_discount_type type public.voucher_discount_kind
  using (
    case
      when override_discount_type is null then null::public.voucher_discount_kind
      else override_discount_type::public.voucher_discount_kind
    end
  );

alter table public.voucher_instances
  alter column override_product_scope type public.voucher_product_scope
  using (
    case
      when override_product_scope is null then null::public.voucher_product_scope
      else override_product_scope::public.voucher_product_scope
    end
  );

-- ---------------------------------------------------------------------------
-- voucher_batch_stats (see 20260415150000) — recreated after column enums
-- ---------------------------------------------------------------------------
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

comment on view public.voucher_batch_stats is 'Batch listing: shared vs multi counts.';

grant select on public.voucher_batch_stats to authenticated;

-- ---------------------------------------------------------------------------
-- Recreate voucher CHECK constraints (same rules as 20260415170000)
-- ---------------------------------------------------------------------------
alter table public.voucher_batches
  add constraint voucher_batches_valid_range check (
    (valid_from is null and valid_until is null)
    or (valid_from is not null and valid_until is not null and valid_until > valid_from)
  );

alter table public.voucher_batches
  add constraint voucher_batches_discount_pair check (
    (discount_type is null and voucher_amount is null)
    or (
      discount_type = 'percentage'::public.voucher_discount_kind
      and voucher_amount is not null
      and voucher_amount > 0
      and voucher_amount <= 100
    )
    or (
      discount_type = 'fixed'::public.voucher_discount_kind
      and voucher_amount is not null
      and voucher_amount > 0
    )
  );

alter table public.voucher_batches
  add constraint voucher_batches_product_ids_when_specific check (
    product_scope is distinct from 'specific'::public.voucher_product_scope
    or cardinality(product_ids) >= 1
  );

alter table public.voucher_batches
  add constraint voucher_batches_shared_requires_rules check (
    batch_kind is distinct from 'shared'::public.voucher_batch_kind
    or (
      discount_type is not null
      and voucher_amount is not null
      and valid_from is not null
      and valid_until is not null
    )
  );

alter table public.voucher_batches
  add constraint voucher_batches_kind_code_ck check (
    (batch_kind = 'multi'::public.voucher_batch_kind and shared_code is null)
    or (batch_kind = 'shared'::public.voucher_batch_kind and shared_code is not null)
  );

alter table public.voucher_instances
  add constraint voucher_instances_override_discount_type_check check (
    override_discount_type is null
    or override_discount_type in ('fixed', 'percentage')
  );

alter table public.voucher_instances
  add constraint voucher_instances_override_product_scope_check check (
    override_product_scope is null
    or override_product_scope in ('all', 'specific')
  );

-- ---------------------------------------------------------------------------
-- Signup provider trigger + backfill from identities
-- ---------------------------------------------------------------------------
create or replace function public.sync_users_signup_provider_from_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  select count(*)::int into n
  from auth.identities
  where user_id = new.user_id;

  if n = 1 then
    update public.users
    set
      signup_provider = public.map_identity_provider_to_enum(new.provider::text),
      updated_at = now()
    where auth_id = new.user_id;
  end if;

  return new;
end;
$$;

update public.users u
set
  signup_provider = public.map_identity_provider_to_enum(i.provider::text),
  updated_at = now()
from (
  select distinct on (user_id) user_id, provider
  from auth.identities
  order by user_id, created_at asc nulls last
) i
where u.auth_id = i.user_id
  and u.signup_provider = 'unknown'::public.auth_signup_provider;

-- ---------------------------------------------------------------------------
-- profiles view (match 20260416110000_user_gender_enum)
-- ---------------------------------------------------------------------------
create view public.profiles as
select
  id,
  auth_id,
  first_name,
  last_name,
  phone,
  gender,
  date_of_birth,
  signup_provider,
  created_at,
  updated_at
from public.users;

comment on view public.profiles is 'Customer profile; same rows as public.users (auth_id → auth.users).';

-- ---------------------------------------------------------------------------
-- place_order (PKR / paisa) — unchanged logic; columns are now enums
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
  v_note text := nullif(trim(coalesce(p_payload->>'customer_note', '')), '');

  v_shipping_cents int := 50000;
  v_discount_cents int := 0;
  v_currency text := coalesce(nullif(trim(coalesce(p_payload->>'currency', '')), ''), 'PKR');

  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_subtotal_cents bigint := 0;
  v_total_cents bigint;

  rec record;
  v_variant_id uuid;
  v_qty int;
  v_line_cents bigint;
  v_sku text;
  v_pname text;
  v_opts jsonb;
  v_price numeric;
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
      coalesce(inv.quantity_on_hand, 0)::int
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

  v_total_cents := v_subtotal_cents + v_shipping_cents - v_discount_cents;
  if v_total_cents < 0 or v_total_cents > 2147483647 then
    return jsonb_build_object('ok', false, 'error', 'Invalid total');
  end if;

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
    payment_method,
    customer_note,
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
    'cod'::public.payment_method,
    coalesce(v_note, ''),
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

    select pv.sku, pv.option_values, pv.price, p.name
    into v_sku, v_opts, v_price, v_pname
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = v_variant_id;

    v_line_cents := round(v_price * 100)::bigint;

    insert into public.order_items (
      order_id,
      product_variant_id,
      product_name_snapshot,
      sku_snapshot,
      unit_price_cents,
      quantity,
      option_values_snapshot
    ) values (
      v_order_id,
      v_variant_id,
      v_pname,
      v_sku,
      v_line_cents::int,
      v_qty,
      coalesce(v_opts, '{}'::jsonb)
    );

    update public.inventory inv
    set
      quantity_on_hand = inv.quantity_on_hand - v_qty,
      updated_at = now()
    where inv.product_variant_id = v_variant_id
      and inv.quantity_on_hand >= v_qty;

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
    'total_cents', v_total_cents::int
  );
end;
$$;

comment on function public.place_order(jsonb) is
  'Checkout: PKR; *_cents in paisa; order_status / payment_method are enums.';

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- apply_voucher — explicit ::text for JSON + comparisons (columns are enums)
-- ---------------------------------------------------------------------------
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

    if v_batch.batch_kind is distinct from 'multi'::public.voucher_batch_kind then
      return jsonb_build_object('ok', false, 'error', 'Invalid voucher');
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
  where b.batch_kind = 'shared'::public.voucher_batch_kind
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

  if v_batch.product_scope = 'specific'::public.voucher_product_scope then
    select exists (
      select 1
      from unnest(coalesce(p_cart_product_ids, '{}'::uuid[])) c(pid)
      where pid = any (v_batch.product_ids)
    ) into v_has_product;
    if not coalesce(v_has_product, false) then
      return jsonb_build_object('ok', false, 'error', 'Voucher does not apply to items in your cart');
    end if;
  end if;

  if v_batch.discount_type = 'fixed'::public.voucher_discount_kind then
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
    'discount_type', v_batch.discount_type::text,
    'voucher_kind', 'shared'
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Could not apply voucher');
end;
$$;

comment on function public.apply_voucher(text, numeric, uuid[]) is
  'Multi/shared voucher redemption; voucher columns use enums.';

revoke all on function public.apply_voucher(text, numeric, uuid[]) from public;
grant execute on function public.apply_voucher(text, numeric, uuid[]) to authenticated;
