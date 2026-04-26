-- Repair schema drift: older migration versions can be recorded in
-- supabase_migrations.schema_migrations without these columns existing
-- (repair/mark-applied, manual drops, restored snapshots, etc.).
-- Re-applies the same DDL as 20260720120000 + 20260721120000 + default from 20260722140000.
-- Idempotent: safe if columns already exist.

alter table public.store_settings
  add column if not exists favicon_url text not null default '';

comment on column public.store_settings.favicon_url is
  'Public favicon URL used by storefront metadata icons (absolute URL or root-relative path).';

alter table public.store_settings
  add column if not exists footer_customer_care_title text not null default 'Customer care';

alter table public.store_settings
  add column if not exists footer_policy_links jsonb not null default '[]'::jsonb;

comment on column public.store_settings.footer_customer_care_title is
  'Heading shown above the customer-care links in the storefront footer.';

comment on column public.store_settings.footer_policy_links is
  'Ordered JSON array of { "slug": string, "label": string } for /policies/[slug]. Contact us is always appended by the storefront.';

alter table public.store_settings
  alter column footer_policy_links set default '[]'::jsonb;
