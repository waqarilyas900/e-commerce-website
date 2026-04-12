-- Many-to-many products ↔ collections (Shopify-style). Replaces single products.collection_id.

create table if not exists public.product_collections (
  product_id uuid not null references public.products (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, collection_id)
);

create index if not exists product_collections_collection_id_idx
  on public.product_collections (collection_id);

create index if not exists product_collections_product_id_idx
  on public.product_collections (product_id);

-- Migrate existing single assignment
insert into public.product_collections (product_id, collection_id)
select id, collection_id
from public.products
where collection_id is not null
on conflict (product_id, collection_id) do nothing;

alter table public.products drop column if exists collection_id;

drop index if exists public.products_collection_id_idx;

alter table public.product_collections enable row level security;

-- Visible when parent product is active (for storefront), or any row for admins
create policy "product_collections_select_public_or_admin"
  on public.product_collections for select
  to anon, authenticated
  using (
    public.is_active_admin()
    or exists (
      select 1 from public.products p
      where p.id = product_collections.product_id
        and p.status = 'active'
    )
  );

create policy "product_collections_insert_admin"
  on public.product_collections for insert
  to authenticated
  with check (public.is_active_admin());

create policy "product_collections_delete_admin"
  on public.product_collections for delete
  to authenticated
  using (public.is_active_admin());

comment on table public.product_collections is 'Join: a product may belong to zero, one, or many collections.';
