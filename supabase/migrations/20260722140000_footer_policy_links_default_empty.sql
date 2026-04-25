-- New rows: do not pre-fill footer policy links (merchants add them in Admin → Settings or rely on Policies CMS).
-- Existing rows keep their JSON; the storefront only renders /policies/[slug] links when a matching policy_pages row exists.

alter table public.store_settings
  alter column footer_policy_links set default '[]'::jsonb;
