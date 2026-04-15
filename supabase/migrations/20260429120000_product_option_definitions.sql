-- Normalized PDP option layout (replaces products.variant_option_schema JSON).

create table if not exists public.product_option_definitions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  option_key text not null,
  label text not null default '',
  presentation text not null default 'pills'
    check (
      presentation in ('pills', 'swatches', 'badges', 'dropdown')
    ),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint product_option_definitions_product_key unique (product_id, option_key)
);

create index if not exists product_option_definitions_product_id_idx
  on public.product_option_definitions (product_id);

comment on table public.product_option_definitions is
  'Storefront PDP: one row per variant dimension (option_values key); labels and presentation.';

-- Migrate from legacy JSON column (added in 20260428120000).
insert into public.product_option_definitions (
  product_id,
  option_key,
  label,
  presentation,
  sort_order
)
select
  p.id,
  left(btrim(elem->>'key'), 200),
  coalesce(
    nullif(btrim(elem->>'label'), ''),
    btrim(elem->>'key')
  ),
  case
    when btrim(coalesce(elem->>'presentation', '')) in (
      'pills', 'swatches', 'badges', 'dropdown'
    )
      then btrim(elem->>'presentation')
    else 'pills'
  end,
  coalesce(
    (nullif(btrim(elem->>'sort_order'), ''))::int,
    (ord - 1)::int
  )
from public.products p
cross join lateral jsonb_array_elements(p.variant_option_schema)
  with ordinality as t(elem, ord)
where coalesce(btrim(elem->>'key'), '') <> ''
on conflict (product_id, option_key) do nothing;

alter table public.products drop column if exists variant_option_schema;

alter table public.product_option_definitions enable row level security;

create policy "product_option_definitions_select_public"
  on public.product_option_definitions for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_option_definitions.product_id
        and (
          p.status = 'active'::public.product_status
          or public.is_active_admin()
        )
    )
  );

create policy "product_option_definitions_mutate_admin"
  on public.product_option_definitions for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());
