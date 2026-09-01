-- Internal storefront search keywords per product (title/description still searched separately).

alter table public.products
  add column if not exists search_keywords text not null default '',
  add column if not exists search_keywords_extra text not null default '';

comment on column public.products.search_keywords is
  'Denormalized comma-separated search terms (auto-generated + manual extras). Used by storefront catalog search.';
comment on column public.products.search_keywords_extra is
  'Admin-only manual search terms; merged into search_keywords on product save.';

-- Basic backfill: name, slug, tags, short description, variant SKUs.
update public.products p
set search_keywords = trim(both from concat_ws(
  ', ',
  nullif(trim(p.name), ''),
  nullif(replace(p.slug, '-', ' '), ''),
  nullif(regexp_replace(coalesce(p.short_description, ''), '<[^>]+>', ' ', 'g'), ''),
  nullif(array_to_string(coalesce(p.tags, '{}'), ', '), ''),
  nullif((
    select string_agg(distinct v.sku, ', ')
    from public.product_variants v
    where v.product_id = p.id and nullif(trim(v.sku), '') is not null
  ), '')
))
where coalesce(p.search_keywords, '') = '';
