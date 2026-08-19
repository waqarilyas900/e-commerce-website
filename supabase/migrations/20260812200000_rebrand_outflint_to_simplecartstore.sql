-- Rebrand leftover Outflint copy to SimpleCartStore (SEO + store settings).
-- Safe to re-run: only rewrites text that still contains Outflint / outflint.

update public.seo_meta
set
  title = replace(replace(title, 'Outflint', 'SimpleCartStore'), 'outflint', 'simplecartstore'),
  description = replace(
    replace(description, 'Outflint', 'SimpleCartStore'),
    'outflint',
    'simplecartstore'
  ),
  keywords = (
    select coalesce(array_agg(
      replace(replace(k, 'Outflint', 'SimpleCartStore'), 'outflint', 'simplecartstore')
      order by ord
    ), '{}'::text[])
    from unnest(coalesce(keywords, '{}'::text[])) with ordinality as t(k, ord)
  ),
  updated_at = now()
where title ilike '%outflint%'
   or description ilike '%outflint%'
   or exists (
     select 1
     from unnest(coalesce(keywords, '{}'::text[])) as k
     where k ilike '%outflint%'
   );

update public.store_settings
set
  store_name = case
    when store_name ilike '%outflint%'
      then replace(replace(store_name, 'Outflint', 'SimpleCartStore'), 'outflint', 'simplecartstore')
    else store_name
  end,
  site_title = case
    when site_title ilike '%outflint%'
      then replace(replace(site_title, 'Outflint', 'SimpleCartStore'), 'outflint', 'simplecartstore')
    else site_title
  end
where store_name ilike '%outflint%'
   or site_title ilike '%outflint%';
