-- Home page marketing: mission strip + hero slideshow (managed from admin panel).

-- ---------------------------------------------------------------------------
-- Singleton: mission paragraph below hero (storefront falls back to catalog if empty)
-- ---------------------------------------------------------------------------
create table if not exists public.home_page_settings (
  id int primary key check (id = 1),
  mission_paragraph text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.home_page_settings (id) values (1)
on conflict (id) do nothing;

comment on table public.home_page_settings is
  'Single row (id=1). mission_paragraph shown in MissionStrip; empty uses catalog default.';

-- ---------------------------------------------------------------------------
-- Hero carousel slides
-- ---------------------------------------------------------------------------
create table if not exists public.home_hero_slides (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  title text not null,
  image_url text not null,
  href text not null default '/',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists home_hero_slides_active_sort_idx
  on public.home_hero_slides (is_active, sort_order);

comment on table public.home_hero_slides is
  'Homepage hero slideshow; inactive rows hidden from storefront unless admin.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.home_page_settings enable row level security;
alter table public.home_hero_slides enable row level security;

create policy "home_page_settings_select_public"
  on public.home_page_settings for select
  to anon, authenticated
  using (true);

create policy "home_page_settings_mutate_admin"
  on public.home_page_settings for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "home_hero_slides_select_storefront"
  on public.home_hero_slides for select
  to anon, authenticated
  using (is_active = true);

create policy "home_hero_slides_select_admin"
  on public.home_hero_slides for select
  to authenticated
  using (public.is_active_admin());

create policy "home_hero_slides_mutate_admin"
  on public.home_hero_slides for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());
