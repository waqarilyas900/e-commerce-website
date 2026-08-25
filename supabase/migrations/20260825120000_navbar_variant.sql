-- Navbar layout variant for storefront header chrome.
alter table public.home_page_settings
  add column if not exists navbar_variant text not null default 'v1';

alter table public.home_page_settings
  drop constraint if exists home_page_settings_navbar_variant_check;

alter table public.home_page_settings
  add constraint home_page_settings_navbar_variant_check
  check (navbar_variant in ('v1', 'v2'));

comment on column public.home_page_settings.navbar_variant is
  'Storefront header layout: v1 = classic centered logo; v2 = AliExpress-style search bar.';
