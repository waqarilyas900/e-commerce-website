alter table public.store_settings
  add column if not exists favicon_url text not null default '';

comment on column public.store_settings.favicon_url is
  'Public favicon URL used by storefront metadata icons (absolute URL or root-relative path).';
