-- Storefront copy and config: no static catalog fallbacks — read from these tables/columns.

alter table public.store_settings
  add column if not exists site_title text not null default '',
  add column if not exists site_description text not null default '',
  add column if not exists footer_phone text not null default '',
  add column if not exists footer_hours_line text not null default '',
  add column if not exists footer_links jsonb not null default '[]'::jsonb;

comment on column public.store_settings.site_title is 'SEO / browser title; when empty UI may use store_name only.';
comment on column public.store_settings.site_description is 'Meta description.';
comment on column public.store_settings.footer_links is 'JSON array of { "label": string, "href": string } for footer explore links.';

alter table public.home_page_settings
  add column if not exists home_rails jsonb not null default '[]'::jsonb,
  add column if not exists featured_block jsonb,
  add column if not exists why_shop_block jsonb,
  add column if not exists bundles jsonb not null default '[]'::jsonb;

comment on column public.home_page_settings.home_rails is
  'Array of { "title", "viewAllHref", "productSlugs": string[] } for homepage product rails.';
comment on column public.home_page_settings.featured_block is
  'Optional homepage featured band JSON (image + copy + CTAs).';
comment on column public.home_page_settings.why_shop_block is
  'Optional "why shop" section JSON.';
comment on column public.home_page_settings.bundles is
  'Array of bundle definitions { slug, name, description, discountLabel, productSlugs, image? }.';

-- ---------------------------------------------------------------------------
-- Policy pages (CMS)
-- ---------------------------------------------------------------------------
create table if not exists public.policy_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content_html text not null default '',
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists policy_pages_sort_idx on public.policy_pages (sort_order, title);

comment on table public.policy_pages is 'Legal / info pages; slug matches /policies/[slug].';

alter table public.policy_pages enable row level security;

create policy "policy_pages_select_public"
  on public.policy_pages for select
  to anon, authenticated
  using (true);

create policy "policy_pages_mutate_admin"
  on public.policy_pages for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());
