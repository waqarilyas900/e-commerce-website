-- SEO foundation. Split into focused, single-purpose tables so `store_settings`
-- stays a clean store-config row and SEO admins have a dedicated surface.
--
-- Tables created:
--   public.seo_site                          — org identity, NAP, default OG, locale (1 row)
--   public.seo_social_profiles               — sameAs entries for Organization JSON-LD
--   public.seo_search_engine_verifications   — GSC / Bing / Pinterest / Yandex / Facebook
--   public.seo_analytics                     — GA4 / Meta Pixel / TikTok Pixel IDs
--   public.seo_meta                          — per-page overrides (polymorphic)
--   public.url_redirects                     — 301/302/410 lookup
--   public.product_shopping_attributes       — Shopping/SEO fields off products (1:1)

-- ---------------------------------------------------------------------------
-- 1. seo_site: Organization identity, NAP, locale, default OG image (singleton)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_site (
  id smallint primary key default 1,
  organization_legal_name text not null default '',
  organization_logo_url   text not null default '',
  organization_phone      text not null default '',
  organization_email      text not null default '',
  address_street          text not null default '',
  address_city            text not null default '',
  address_region          text not null default '',
  address_postal_code     text not null default '',
  address_country         text not null default 'PK',
  geo_lat                 numeric(9, 6),
  geo_lng                 numeric(9, 6),
  default_og_image_url    text not null default '',
  default_og_image_alt    text not null default '',
  locale                  text not null default 'en_US',
  updated_at              timestamptz not null default now(),
  updated_by              uuid references public.admins (id) on delete set null,
  -- Hard cap to a single row.
  constraint seo_site_singleton_chk check (id = 1)
);

-- Auto-seed singleton row so storefront reads succeed even before any admin save.
insert into public.seo_site (id) values (1) on conflict (id) do nothing;

comment on table public.seo_site is
  'SEO identity (Organization JSON-LD source). Singleton row id = 1.';
comment on column public.seo_site.default_og_image_url is
  'Fallback OG image (≥ 1200x630) when a page has no override and no first-asset.';

alter table public.seo_site enable row level security;

drop policy if exists "seo_site_select_public" on public.seo_site;
create policy "seo_site_select_public"
  on public.seo_site for select
  to anon, authenticated
  using (true);

drop policy if exists "seo_site_mutate_admin" on public.seo_site;
create policy "seo_site_mutate_admin"
  on public.seo_site for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- ---------------------------------------------------------------------------
-- 2. seo_social_profiles: Organization sameAs entries (variable length)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_social_profiles (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  url text not null,
  -- Optional handle / username; surfaced by admin UI but not required.
  handle text not null default '',
  /**
   * Used for Twitter/X (`twitter:site` meta tag) and Facebook (`fb:app_id` meta).
   * Storefront uses only ONE active row per kind:
   *   - `twitter_handle` when platform = 'twitter' and is_primary = true
   *   - `facebook_app_id` when platform = 'facebook_app' and is_primary = true
   */
  is_primary boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_social_url_format check (
    -- 'facebook_app' rows hold an app_id, not a URL; everything else must be a URL.
    (platform = 'facebook_app') or (url ~* '^https?://')
  )
);

create unique index if not exists seo_social_profiles_one_primary_per_platform
  on public.seo_social_profiles (platform)
  where is_primary = true;

comment on table public.seo_social_profiles is
  'Social profile URLs (Organization sameAs) plus primary identifiers for Twitter/Facebook tags.';

alter table public.seo_social_profiles enable row level security;

drop policy if exists "seo_social_profiles_select_public" on public.seo_social_profiles;
create policy "seo_social_profiles_select_public"
  on public.seo_social_profiles for select
  to anon, authenticated
  using (is_active = true or public.is_active_admin());

drop policy if exists "seo_social_profiles_mutate_admin" on public.seo_social_profiles;
create policy "seo_social_profiles_mutate_admin"
  on public.seo_social_profiles for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- ---------------------------------------------------------------------------
-- 3. seo_search_engine_verifications: meta-tag content for site ownership
-- ---------------------------------------------------------------------------
create table if not exists public.seo_search_engine_verifications (
  id smallint primary key default 1,
  google_site_verification     text not null default '',
  bing_site_verification       text not null default '',
  facebook_domain_verification text not null default '',
  pinterest_site_verification  text not null default '',
  yandex_site_verification     text not null default '',
  updated_at                   timestamptz not null default now(),
  updated_by                   uuid references public.admins (id) on delete set null,
  constraint seo_search_verifications_singleton_chk check (id = 1)
);

insert into public.seo_search_engine_verifications (id) values (1) on conflict (id) do nothing;

comment on table public.seo_search_engine_verifications is
  'Search-console / domain-ownership meta tags (singleton row id = 1).';

alter table public.seo_search_engine_verifications enable row level security;

drop policy if exists "seo_search_verifications_select_public"
  on public.seo_search_engine_verifications;
create policy "seo_search_verifications_select_public"
  on public.seo_search_engine_verifications for select
  to anon, authenticated
  using (true);

drop policy if exists "seo_search_verifications_mutate_admin"
  on public.seo_search_engine_verifications;
create policy "seo_search_verifications_mutate_admin"
  on public.seo_search_engine_verifications for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- ---------------------------------------------------------------------------
-- 4. seo_analytics: tag manager / pixel IDs (singleton)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_analytics (
  id smallint primary key default 1,
  google_analytics_id text not null default '',
  google_tag_manager_id text not null default '',
  meta_pixel_id text not null default '',
  tiktok_pixel_id text not null default '',
  -- Honour cookie consent before firing analytics scripts on the storefront.
  consent_required boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admins (id) on delete set null,
  constraint seo_analytics_singleton_chk check (id = 1)
);

insert into public.seo_analytics (id) values (1) on conflict (id) do nothing;

comment on table public.seo_analytics is
  'Analytics & pixel identifiers (singleton row id = 1).';

alter table public.seo_analytics enable row level security;

drop policy if exists "seo_analytics_select_public" on public.seo_analytics;
create policy "seo_analytics_select_public"
  on public.seo_analytics for select
  to anon, authenticated
  using (true);

drop policy if exists "seo_analytics_mutate_admin" on public.seo_analytics;
create policy "seo_analytics_mutate_admin"
  on public.seo_analytics for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- ---------------------------------------------------------------------------
-- 5. seo_meta: polymorphic per-page overrides (locale-aware)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_meta (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in (
    'product',
    'collection',
    'policy_page',
    'home_section',
    'tag',
    'route',
    'site_default'
  )),
  -- For 'route' / 'site_default' the subject is a stable string (e.g. '/', '/contact').
  subject_id uuid,
  subject_key text,
  locale text not null default 'en',

  title text not null default '',
  description text not null default '',
  keywords text[] not null default '{}',

  canonical_url text not null default '',

  og_image_url text not null default '',
  og_image_alt text not null default '',
  og_image_width int,
  og_image_height int,

  twitter_card text not null default 'summary_large_image'
    check (twitter_card in ('summary', 'summary_large_image')),

  noindex boolean not null default false,
  nofollow boolean not null default false,

  json_ld_overrides jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now(),
  updated_by uuid references public.admins (id) on delete set null,

  -- One override per (subject_type, subject_id|subject_key, locale).
  -- Must not be DEFERRABLE: PostgREST upsert uses ON CONFLICT on these columns.
  constraint seo_meta_subject_id_locale_uniq
    unique (subject_type, subject_id, locale),
  constraint seo_meta_subject_key_locale_uniq
    unique (subject_type, subject_key, locale),
  -- Either subject_id or subject_key must be present.
  constraint seo_meta_subject_present check (
    (subject_id is not null) or (subject_key is not null)
  )
);

create index if not exists seo_meta_subject_idx
  on public.seo_meta (subject_type, subject_id);
create index if not exists seo_meta_subject_key_idx
  on public.seo_meta (subject_type, subject_key);

comment on table public.seo_meta is
  'Per-page SEO overrides; storefront falls back to computed values when empty.';

alter table public.seo_meta enable row level security;

drop policy if exists "seo_meta_select_public" on public.seo_meta;
create policy "seo_meta_select_public"
  on public.seo_meta for select
  to anon, authenticated
  using (true);

drop policy if exists "seo_meta_mutate_admin" on public.seo_meta;
create policy "seo_meta_mutate_admin"
  on public.seo_meta for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- Cascade-delete overrides when their subject row goes away.
create or replace function public.seo_meta_purge_for_subject()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'products' then
    delete from public.seo_meta where subject_type = 'product' and subject_id = old.id;
  elsif tg_table_name = 'collections' then
    delete from public.seo_meta where subject_type = 'collection' and subject_id = old.id;
  elsif tg_table_name = 'policy_pages' then
    delete from public.seo_meta where subject_type = 'policy_page' and subject_id = old.id;
  elsif tg_table_name = 'home_page_sections' then
    delete from public.seo_meta where subject_type = 'home_section' and subject_id = old.id;
  elsif tg_table_name = 'tags' then
    delete from public.seo_meta where subject_type = 'tag' and subject_id = old.id;
  end if;
  return old;
end;
$$;

drop trigger if exists products_purge_seo_meta on public.products;
create trigger products_purge_seo_meta
  after delete on public.products
  for each row execute function public.seo_meta_purge_for_subject();

drop trigger if exists collections_purge_seo_meta on public.collections;
create trigger collections_purge_seo_meta
  after delete on public.collections
  for each row execute function public.seo_meta_purge_for_subject();

drop trigger if exists policy_pages_purge_seo_meta on public.policy_pages;
create trigger policy_pages_purge_seo_meta
  after delete on public.policy_pages
  for each row execute function public.seo_meta_purge_for_subject();

drop trigger if exists home_page_sections_purge_seo_meta on public.home_page_sections;
create trigger home_page_sections_purge_seo_meta
  after delete on public.home_page_sections
  for each row execute function public.seo_meta_purge_for_subject();

drop trigger if exists tags_purge_seo_meta on public.tags;
create trigger tags_purge_seo_meta
  after delete on public.tags
  for each row execute function public.seo_meta_purge_for_subject();

-- ---------------------------------------------------------------------------
-- 6. url_redirects: preserve link equity when slugs change / products retire
-- ---------------------------------------------------------------------------
create table if not exists public.url_redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null,
  to_path text not null,
  status_code int not null default 301 check (status_code in (301, 302, 410)),
  is_active boolean not null default true,
  hits int not null default 0,
  last_hit_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint url_redirects_from_path_uniq unique (from_path),
  constraint url_redirects_from_path_format check (from_path ~ '^/' and length(from_path) <= 2048),
  constraint url_redirects_to_path_format check (
    to_path ~ '^/' or to_path ~* '^https?://'
  )
);

create index if not exists url_redirects_active_idx
  on public.url_redirects (is_active)
  where is_active = true;

comment on table public.url_redirects is
  '301/302/410 lookup table consumed by storefront middleware on 404.';

alter table public.url_redirects enable row level security;

drop policy if exists "url_redirects_select_public" on public.url_redirects;
create policy "url_redirects_select_public"
  on public.url_redirects for select
  to anon, authenticated
  using (is_active = true or public.is_active_admin());

drop policy if exists "url_redirects_mutate_admin" on public.url_redirects;
create policy "url_redirects_mutate_admin"
  on public.url_redirects for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- ---------------------------------------------------------------------------
-- 7. product_shopping_attributes: 1:1 SEO/Shopping fields off products
-- ---------------------------------------------------------------------------
create table if not exists public.product_shopping_attributes (
  product_id uuid primary key references public.products (id) on delete cascade,
  brand_name           text not null default '',
  gtin                 text not null default '',
  mpn                  text not null default '',
  country_of_origin    text not null default '',
  material             text not null default '',
  return_policy_id     uuid references public.policy_pages (id) on delete set null,
  shipping_policy_id   uuid references public.policy_pages (id) on delete set null,
  is_original_imagery  boolean not null default false,
  updated_at           timestamptz not null default now()
);

comment on table public.product_shopping_attributes is
  'Per-product SEO/Shopping attributes. 1:1 with products; created lazily on first edit.';
comment on column public.product_shopping_attributes.gtin is
  'GTIN/EAN/UPC for Google Shopping. 8/12/13/14 digits. Empty when unknown.';
comment on column public.product_shopping_attributes.is_original_imagery is
  'Internal HCS audit flag: true when product photos were shot first-party (not supplier mirror).';

alter table public.product_shopping_attributes enable row level security;

drop policy if exists "product_shopping_select_public" on public.product_shopping_attributes;
create policy "product_shopping_select_public"
  on public.product_shopping_attributes for select
  to anon, authenticated
  using (true);

drop policy if exists "product_shopping_mutate_admin" on public.product_shopping_attributes;
create policy "product_shopping_mutate_admin"
  on public.product_shopping_attributes for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- ---------------------------------------------------------------------------
-- 8. Convenience read function: route-keyed SEO override
-- ---------------------------------------------------------------------------
create or replace function public.seo_meta_for_subject(
  p_subject_type text,
  p_subject_id uuid,
  p_locale text default 'en'
) returns public.seo_meta
language sql
stable
as $$
  select sm.*
  from public.seo_meta sm
  where sm.subject_type = p_subject_type
    and sm.subject_id = p_subject_id
    and sm.locale = p_locale
  limit 1;
$$;

create or replace function public.seo_meta_for_route(
  p_subject_key text,
  p_locale text default 'en'
) returns public.seo_meta
language sql
stable
as $$
  select sm.*
  from public.seo_meta sm
  where sm.subject_type = 'route'
    and sm.subject_key = p_subject_key
    and sm.locale = p_locale
  limit 1;
$$;
