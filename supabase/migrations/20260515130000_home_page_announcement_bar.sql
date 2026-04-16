-- Top announcement bar: rich HTML + colors (managed from admin Hero section).

alter table public.home_page_settings
  add column if not exists announcement_html text not null default '',
  add column if not exists announcement_bar_bg text not null default '#1c1d1d',
  add column if not exists announcement_bar_fg text not null default '#ffffff',
  add column if not exists announcement_enabled boolean not null default true;

comment on column public.home_page_settings.announcement_html is
  'TipTap HTML for the top strip; empty falls back to catalog/env announcement text when enabled.';
comment on column public.home_page_settings.announcement_bar_bg is
  'CSS hex background for the announcement bar.';
comment on column public.home_page_settings.announcement_bar_fg is
  'CSS hex text (and link) color for the announcement bar.';
comment on column public.home_page_settings.announcement_enabled is
  'When false, the announcement bar is hidden on the storefront.';
