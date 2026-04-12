-- Swatch colors: name + optional hex / rgb / image; active flag for storefront pickers.

create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hex text,
  rgb text,
  swatch_image_url text not null default '',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists colors_sort_idx on public.colors (sort_order, name);
create index if not exists colors_active_idx on public.colors (is_active);

insert into public.colors (name, hex, rgb, swatch_image_url, sort_order, is_active)
select v.name, v.hex, v.rgb, '', v.sort_order, true
from (
  values
    ('Black', '#171717', null::text, 10),
    ('White', '#fafafa', null::text, 20),
    ('Navy', '#1e3a5f', null::text, 30)
) as v(name, hex, rgb, sort_order)
where not exists (select 1 from public.colors c where c.name = v.name);

alter table public.product_variants
  add column if not exists color_id uuid references public.colors (id) on delete set null;

create index if not exists product_variants_color_id_idx on public.product_variants (color_id);

comment on table public.colors is 'Product variant color swatches; hex/rgb/image are optional visual hints.';
comment on column public.colors.hex is 'Optional CSS hex, e.g. #171717';
comment on column public.colors.rgb is 'Optional CSS rgb string, e.g. rgb(23,23,23)';
comment on column public.colors.swatch_image_url is 'Optional texture/pattern image URL';

alter table public.colors enable row level security;

create policy "colors_select_all"
  on public.colors for select
  to anon, authenticated
  using (true);

create policy "colors_insert_admin"
  on public.colors for insert
  to authenticated
  with check (public.is_active_admin());

create policy "colors_update_admin"
  on public.colors for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "colors_delete_admin"
  on public.colors for delete
  to authenticated
  using (public.is_active_admin());
