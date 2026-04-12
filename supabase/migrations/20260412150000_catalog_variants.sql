-- Catalog: collections, products, product_variants + RLS (public read active; admins full CRUD).

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where a.auth_id = auth.uid()
      and a.status = 'active'
  );
$$;

comment on function public.is_active_admin() is 'True when the current JWT belongs to an active row in public.admins.';

-- Collections (storefront /collections/[slug])
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text not null default '',
  hero_image text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_slug_key unique (slug)
);

create index if not exists collections_slug_idx on public.collections (slug);

-- Product parent (no price/stock here — variants hold sellable units)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.collections (id) on delete set null,
  slug text not null,
  name text not null,
  short_description text not null default '',
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'active')),
  images jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  rating numeric(3,2),
  reviews_count int not null default 0 check (reviews_count >= 0),
  legacy_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_slug_key unique (slug),
  constraint products_legacy_id_key unique (legacy_id)
);

create index if not exists products_collection_id_idx on public.products (collection_id);
create index if not exists products_legacy_id_idx on public.products (legacy_id);
create index if not exists products_status_idx on public.products (status);

-- Variants: SKU, option_values (e.g. size/color), price, inventory
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null,
  option_values jsonb not null default '{}'::jsonb,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  inventory_quantity int not null default 0 check (inventory_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_sku_key unique (sku)
);

create index if not exists product_variants_product_id_idx on public.product_variants (product_id);

alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;

-- Collections: readable by anyone; mutate only admins
create policy "collections_select_all"
  on public.collections for select
  to anon, authenticated
  using (true);

create policy "collections_insert_admin"
  on public.collections for insert
  to authenticated
  with check (public.is_active_admin());

create policy "collections_update_admin"
  on public.collections for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "collections_delete_admin"
  on public.collections for delete
  to authenticated
  using (public.is_active_admin());

-- Products: public sees active only; admins see and edit all
create policy "products_select_public_or_admin"
  on public.products for select
  to anon, authenticated
  using (status = 'active' or public.is_active_admin());

create policy "products_insert_admin"
  on public.products for insert
  to authenticated
  with check (public.is_active_admin());

create policy "products_update_admin"
  on public.products for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "products_delete_admin"
  on public.products for delete
  to authenticated
  using (public.is_active_admin());

-- Variants: readable if parent product is active (or user is admin)
create policy "product_variants_select_public_or_admin"
  on public.product_variants for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and (p.status = 'active' or public.is_active_admin())
    )
  );

create policy "product_variants_insert_admin"
  on public.product_variants for insert
  to authenticated
  with check (public.is_active_admin());

create policy "product_variants_update_admin"
  on public.product_variants for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "product_variants_delete_admin"
  on public.product_variants for delete
  to authenticated
  using (public.is_active_admin());

comment on table public.collections is 'Product groupings; slug maps to storefront /collections/[slug].';
comment on table public.products is 'Catalog parent; pricing and stock live on product_variants.';
comment on table public.product_variants is 'Sellable SKU; option_values json for size, color, etc.';
