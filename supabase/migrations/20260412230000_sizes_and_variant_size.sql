-- Global size list for variants; optional FK on product_variants.

create table if not exists public.sizes (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sizes_sort_idx on public.sizes (sort_order, label);

insert into public.sizes (label, sort_order)
select v.label, v.sort_order
from (
  values
    ('XS', 10),
    ('S', 20),
    ('M', 30),
    ('L', 40),
    ('XL', 50),
    ('XXL', 60)
) as v(label, sort_order)
where not exists (select 1 from public.sizes s where s.label = v.label);

alter table public.product_variants
  add column if not exists size_id uuid references public.sizes (id) on delete set null;

create index if not exists product_variants_size_id_idx on public.product_variants (size_id);

comment on table public.sizes is 'Sellable size labels (XS, S, M, …); referenced by product_variants.size_id.';
comment on column public.product_variants.size_id is 'Optional link to sizes; option_values may still duplicate size for storefront.';

alter table public.sizes enable row level security;

create policy "sizes_select_all"
  on public.sizes for select
  to anon, authenticated
  using (true);

create policy "sizes_insert_admin"
  on public.sizes for insert
  to authenticated
  with check (public.is_active_admin());

create policy "sizes_update_admin"
  on public.sizes for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "sizes_delete_admin"
  on public.sizes for delete
  to authenticated
  using (public.is_active_admin());
