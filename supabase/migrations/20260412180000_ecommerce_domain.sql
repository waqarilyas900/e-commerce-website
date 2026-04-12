-- Single-tenant ecommerce domain: no `stores` table (use store_settings row id=1).
-- Profiles: `public.profiles` view over `public.users` (auth-linked customer rows).
-- Inventory: normalized stock + reservations per variant (replaces product_variants.inventory_quantity).

-- ---------------------------------------------------------------------------
-- Store (singleton)
-- ---------------------------------------------------------------------------
create table if not exists public.store_settings (
  id int primary key check (id = 1),
  store_name text not null default 'Store',
  support_email text not null default '',
  default_currency text not null default 'USD',
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values (1)
on conflict (id) do nothing;

comment on table public.store_settings is 'Single-tenant site config; exactly one row (id = 1).';

-- ---------------------------------------------------------------------------
-- Profiles view (alias for public.users — Supabase convention)
-- ---------------------------------------------------------------------------
create or replace view public.profiles as
select
  id,
  auth_id,
  first_name,
  last_name,
  phone,
  created_at,
  updated_at
from public.users;

comment on view public.profiles is 'Customer profile; same rows as public.users (auth_id → auth.users).';

-- ---------------------------------------------------------------------------
-- Product media (optional migration from products.images jsonb over time)
-- ---------------------------------------------------------------------------
create table if not exists public.product_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  alt_text text not null default '',
  kind text not null default 'image' check (kind in ('image', 'video')),
  created_at timestamptz not null default now()
);

create index if not exists product_assets_product_id_idx on public.product_assets (product_id);

comment on table public.product_assets is 'Gallery assets; products.images jsonb remains for storefront until migrated.';

-- ---------------------------------------------------------------------------
-- Inventory (per variant)
-- ---------------------------------------------------------------------------
create table if not exists public.inventory (
  product_variant_id uuid primary key references public.product_variants (id) on delete cascade,
  quantity_on_hand int not null default 0 check (quantity_on_hand >= 0),
  quantity_reserved int not null default 0 check (quantity_reserved >= 0),
  updated_at timestamptz not null default now(),
  constraint inventory_reserved_lte_hand check (quantity_reserved <= quantity_on_hand)
);

comment on table public.inventory is 'Stock ledger per SKU; sellable ≈ quantity_on_hand - quantity_reserved.';

-- Backfill from legacy column, then drop it
insert into public.inventory (product_variant_id, quantity_on_hand, quantity_reserved, updated_at)
select id, inventory_quantity, 0, now()
from public.product_variants
on conflict (product_variant_id) do update set
  quantity_on_hand = excluded.quantity_on_hand,
  updated_at = excluded.updated_at;

alter table public.product_variants drop column if exists inventory_quantity;

comment on column public.inventory.quantity_on_hand is 'Physical units; app/seed must insert a row after each product_variants insert.';

-- ---------------------------------------------------------------------------
-- Shipping & discounts
-- ---------------------------------------------------------------------------
create table if not exists public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  price_cents int not null default 0 check (price_cents >= 0),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint shipping_methods_code_key unique (code)
);

create index if not exists shipping_methods_active_idx on public.shipping_methods (is_active, sort_order);

insert into public.shipping_methods (code, name, price_cents, sort_order, is_active)
values
  ('standard', 'Standard', 0, 0, true),
  ('express', 'Express', 999, 1, true)
on conflict (code) do nothing;

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text not null default '',
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  amount numeric(12, 2) not null check (amount >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discounts_code_key unique (code)
);

create index if not exists discounts_active_idx on public.discounts (is_active);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  email text not null default '',
  status text not null default 'pending' check (
    status in ('pending', 'paid', 'processing', 'shipped', 'cancelled', 'refunded')
  ),
  subtotal_cents int not null default 0 check (subtotal_cents >= 0),
  discount_cents int not null default 0 check (discount_cents >= 0),
  shipping_cents int not null default 0 check (shipping_cents >= 0),
  total_cents int not null default 0 check (total_cents >= 0),
  currency text not null default 'USD',
  discount_id uuid references public.discounts (id) on delete set null,
  shipping_method_id uuid references public.shipping_methods (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_variant_id uuid not null references public.product_variants (id),
  product_name_snapshot text not null,
  sku_snapshot text not null,
  unit_price_cents int not null check (unit_price_cents >= 0),
  quantity int not null check (quantity > 0 and quantity <= 9999)
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- Cart (signed-in users; anonymous carts remain client localStorage in this app)
-- ---------------------------------------------------------------------------
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  product_variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity int not null check (quantity > 0 and quantity <= 999),
  updated_at timestamptz not null default now(),
  constraint cart_items_user_variant_key unique (user_id, product_variant_id)
);

create index if not exists cart_items_user_id_idx on public.cart_items (user_id);

-- ---------------------------------------------------------------------------
-- Reviews & wishlists
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  title text not null default '',
  body text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_product_user_key unique (product_id, user_id)
);

create index if not exists reviews_product_id_idx on public.reviews (product_id);
create index if not exists reviews_status_idx on public.reviews (status);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint wishlists_user_product_key unique (user_id, product_id)
);

create index if not exists wishlists_user_id_idx on public.wishlists (user_id);

-- ---------------------------------------------------------------------------
-- Audit (admin actions)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_auth_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.store_settings enable row level security;
alter table public.product_assets enable row level security;
alter table public.inventory enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.discounts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.cart_items enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlists enable row level security;
alter table public.audit_logs enable row level security;

-- store_settings: public read
create policy "store_settings_select_all"
  on public.store_settings for select
  to anon, authenticated
  using (true);

create policy "store_settings_update_admin"
  on public.store_settings for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- product_assets: read if product visible
create policy "product_assets_select_public"
  on public.product_assets for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_assets.product_id
        and (p.status = 'active' or public.is_active_admin())
    )
  );

create policy "product_assets_mutate_admin"
  on public.product_assets for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- inventory
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
        and pr.status = 'active'
    )
  );

create policy "inventory_insert_admin"
  on public.inventory for insert
  to authenticated
  with check (public.is_active_admin());

create policy "inventory_update_admin"
  on public.inventory for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "inventory_delete_admin"
  on public.inventory for delete
  to authenticated
  using (public.is_active_admin());

-- shipping_methods
create policy "shipping_methods_select_active"
  on public.shipping_methods for select
  to anon, authenticated
  using (is_active or public.is_active_admin());

create policy "shipping_methods_mutate_admin"
  on public.shipping_methods for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- discounts (hide inactive from non-admins)
create policy "discounts_select"
  on public.discounts for select
  to anon, authenticated
  using (
    public.is_active_admin()
    or (
      is_active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    )
  );

create policy "discounts_mutate_admin"
  on public.discounts for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- orders: own rows via users.auth_id
create policy "orders_select_own_or_admin"
  on public.orders for select
  to authenticated
  using (
    public.is_active_admin()
    or exists (
      select 1 from public.users u
      where u.id = orders.user_id
        and u.auth_id = auth.uid()
    )
  );

create policy "orders_insert_authenticated"
  on public.orders for insert
  to authenticated
  with check (
    public.is_active_admin()
    or (
      user_id is not null
      and exists (
        select 1 from public.users u
        where u.id = orders.user_id
          and u.auth_id = auth.uid()
      )
    )
  );

create policy "orders_update_own_or_admin"
  on public.orders for update
  to authenticated
  using (
    public.is_active_admin()
    or exists (
      select 1 from public.users u
      where u.id = orders.user_id
        and u.auth_id = auth.uid()
    )
  )
  with check (
    public.is_active_admin()
    or exists (
      select 1 from public.users u
      where u.id = orders.user_id
        and u.auth_id = auth.uid()
    )
  );

-- order_items: same visibility as parent order
create policy "order_items_select"
  on public.order_items for select
  to authenticated
  using (
    public.is_active_admin()
    or exists (
      select 1 from public.orders o
      join public.users u on u.id = o.user_id
      where o.id = order_items.order_id
        and u.auth_id = auth.uid()
    )
  );

create policy "order_items_insert"
  on public.order_items for insert
  to authenticated
  with check (
    public.is_active_admin()
    or exists (
      select 1 from public.orders o
      join public.users u on u.id = o.user_id
      where o.id = order_items.order_id
        and u.auth_id = auth.uid()
    )
  );

create policy "order_items_update_admin"
  on public.order_items for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "order_items_delete_admin"
  on public.order_items for delete
  to authenticated
  using (public.is_active_admin());

-- cart_items
create policy "cart_items_own"
  on public.cart_items for all
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = cart_items.user_id
        and u.auth_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = cart_items.user_id
        and u.auth_id = auth.uid()
    )
  );

-- reviews
create policy "reviews_select_approved_or_admin"
  on public.reviews for select
  to anon, authenticated
  using (
    public.is_active_admin()
    or status = 'approved'
    or exists (
      select 1 from public.users u
      where u.id = reviews.user_id
        and u.auth_id = auth.uid()
    )
  );

create policy "reviews_insert_own"
  on public.reviews for insert
  to authenticated
  with check (
    exists (
      select 1 from public.users u
      where u.id = reviews.user_id
        and u.auth_id = auth.uid()
    )
  );

create policy "reviews_update_own_or_admin"
  on public.reviews for update
  to authenticated
  using (
    public.is_active_admin()
    or exists (
      select 1 from public.users u
      where u.id = reviews.user_id
        and u.auth_id = auth.uid()
    )
  )
  with check (
    public.is_active_admin()
    or exists (
      select 1 from public.users u
      where u.id = reviews.user_id
        and u.auth_id = auth.uid()
    )
  );

-- wishlists
create policy "wishlists_own"
  on public.wishlists for all
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = wishlists.user_id
        and u.auth_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = wishlists.user_id
        and u.auth_id = auth.uid()
    )
  );

-- audit_logs: admins only
create policy "audit_logs_admin_only"
  on public.audit_logs for select
  to authenticated
  using (public.is_active_admin());

create policy "audit_logs_insert_admin"
  on public.audit_logs for insert
  to authenticated
  with check (public.is_active_admin());
