-- Block B: money-page SEO copy upgrade (products + collections, English)
-- Strategy:
--   1) Keep manual/campaign copy untouched.
--   2) Upgrade only "generic/default" rows produced by earlier backfills.
--   3) Add Pakistan buying-intent language to improve CTR for commercial queries.
--
-- Safety:
--   - No changes to OG image URLs or canonical URLs.
--   - Updates are scoped to locale = 'en'.

-- ---------------------------------------------------------------------------
-- Products: upgrade generic title/description/keywords in existing seo_meta
-- ---------------------------------------------------------------------------
with product_src as (
  select
    p.id,
    left(btrim(p.name) || ' in Pakistan | Outflint', 500) as title_upgraded,
    left(
      coalesce(
        nullif(trim(regexp_replace(regexp_replace(coalesce(p.short_description, ''), '<[^>]+>', ' ', 'gi'), '\\s+', ' ', 'g')), ''),
        nullif(trim(regexp_replace(regexp_replace(coalesce(p.description, ''), '<[^>]+>', ' ', 'gi'), '\\s+', ' ', 'g')), ''),
        trim(p.name)
      )
      || ' Buy online in Pakistan with fast nationwide delivery and cash on delivery from Outflint.',
      160
    ) as desc_upgraded,
    array[
      'tailoring supplies pakistan',
      'sewing accessories pakistan',
      'dressmaking tools pakistan',
      'industrial sewing machine parts',
      'outflint pakistan'
    ]::text[] as kw_upgraded
  from public.products p
)
update public.seo_meta sm
set
  title = case
    when btrim(sm.title) = ''
      or btrim(sm.title) = left(btrim(p.name), 500)
      then ps.title_upgraded
    else sm.title
  end,
  description = case
    when btrim(sm.description) = ''
      or sm.description ilike '%Tailoring supplies and sewing notions for dressmaking, alterations, and professional stitching.%'
      then ps.desc_upgraded
    else sm.description
  end,
  keywords = case
    when sm.keywords is null or coalesce(array_length(sm.keywords, 1), 0) = 0
      then ps.kw_upgraded
    else sm.keywords
  end,
  updated_at = now()
from product_src ps
join public.products p on p.id = ps.id
where sm.subject_type = 'product'
  and sm.subject_id = ps.id
  and sm.locale = 'en'
  and (
    btrim(sm.title) = ''
    or btrim(sm.title) = left(btrim(p.name), 500)
    or btrim(sm.description) = ''
    or sm.description ilike '%Tailoring supplies and sewing notions for dressmaking, alterations, and professional stitching.%'
    or sm.keywords is null
    or coalesce(array_length(sm.keywords, 1), 0) = 0
  );

-- Products: insert seo_meta where missing (upgraded templates)
insert into public.seo_meta (
  subject_type,
  subject_id,
  subject_key,
  locale,
  title,
  description,
  keywords,
  canonical_url,
  og_image_url,
  og_image_alt,
  og_image_width,
  og_image_height,
  twitter_card,
  noindex,
  nofollow,
  json_ld_overrides
)
select
  'product'::text,
  p.id,
  null::text,
  'en'::text,
  left(btrim(p.name) || ' in Pakistan | Outflint', 500),
  left(
    coalesce(
      nullif(trim(regexp_replace(regexp_replace(coalesce(p.short_description, ''), '<[^>]+>', ' ', 'gi'), '\\s+', ' ', 'g')), ''),
      nullif(trim(regexp_replace(regexp_replace(coalesce(p.description, ''), '<[^>]+>', ' ', 'gi'), '\\s+', ' ', 'g')), ''),
      trim(p.name)
    )
    || ' Buy online in Pakistan with fast nationwide delivery and cash on delivery from Outflint.',
    160
  ),
  array[
    'tailoring supplies pakistan',
    'sewing accessories pakistan',
    'dressmaking tools pakistan',
    'industrial sewing machine parts',
    'outflint pakistan'
  ]::text[],
  '',
  '',
  '',
  null,
  null,
  'summary_large_image'::text,
  false,
  false,
  '{}'::jsonb
from public.products p
where not exists (
  select 1
  from public.seo_meta e
  where e.subject_type = 'product'
    and e.subject_id = p.id
    and e.locale = 'en'
);

-- ---------------------------------------------------------------------------
-- Collections: upgrade generic title/description/keywords in existing seo_meta
-- ---------------------------------------------------------------------------
with collection_src as (
  select
    c.id,
    left(btrim(c.name) || ' in Pakistan | Outflint', 500) as title_upgraded,
    left(
      coalesce(
        nullif(trim(regexp_replace(regexp_replace(coalesce(c.description, ''), '<[^>]+>', ' ', 'gi'), '\\s+', ' ', 'g')), ''),
        trim(c.name)
      )
      || ' Shop this collection in Pakistan with fast delivery and quality tailoring essentials from Outflint.',
      160
    ) as desc_upgraded,
    array[
      'sewing collection pakistan',
      'tailoring supplies pakistan',
      'dressmaking accessories',
      'stitching tools pakistan',
      'outflint collection'
    ]::text[] as kw_upgraded
  from public.collections c
)
update public.seo_meta sm
set
  title = case
    when btrim(sm.title) = ''
      or btrim(sm.title) = left(btrim(c.name), 500)
      then cs.title_upgraded
    else sm.title
  end,
  description = case
    when btrim(sm.description) = ''
      or sm.description ilike '%Browse tailoring supplies, sewing notions, and stitching accessories in this collection.%'
      then cs.desc_upgraded
    else sm.description
  end,
  keywords = case
    when sm.keywords is null or coalesce(array_length(sm.keywords, 1), 0) = 0
      then cs.kw_upgraded
    else sm.keywords
  end,
  updated_at = now()
from collection_src cs
join public.collections c on c.id = cs.id
where sm.subject_type = 'collection'
  and sm.subject_id = cs.id
  and sm.locale = 'en'
  and (
    btrim(sm.title) = ''
    or btrim(sm.title) = left(btrim(c.name), 500)
    or btrim(sm.description) = ''
    or sm.description ilike '%Browse tailoring supplies, sewing notions, and stitching accessories in this collection.%'
    or sm.keywords is null
    or coalesce(array_length(sm.keywords, 1), 0) = 0
  );

-- Collections: insert seo_meta where missing (upgraded templates)
insert into public.seo_meta (
  subject_type,
  subject_id,
  subject_key,
  locale,
  title,
  description,
  keywords,
  canonical_url,
  og_image_url,
  og_image_alt,
  og_image_width,
  og_image_height,
  twitter_card,
  noindex,
  nofollow,
  json_ld_overrides
)
select
  'collection'::text,
  c.id,
  null::text,
  'en'::text,
  left(btrim(c.name) || ' in Pakistan | Outflint', 500),
  left(
    coalesce(
      nullif(trim(regexp_replace(regexp_replace(coalesce(c.description, ''), '<[^>]+>', ' ', 'gi'), '\\s+', ' ', 'g')), ''),
      trim(c.name)
    )
    || ' Shop this collection in Pakistan with fast delivery and quality tailoring essentials from Outflint.',
    160
  ),
  array[
    'sewing collection pakistan',
    'tailoring supplies pakistan',
    'dressmaking accessories',
    'stitching tools pakistan',
    'outflint collection'
  ]::text[],
  '',
  '',
  '',
  null,
  null,
  'summary_large_image'::text,
  false,
  false,
  '{}'::jsonb
from public.collections c
where not exists (
  select 1
  from public.seo_meta e
  where e.subject_type = 'collection'
    and e.subject_id = c.id
    and e.locale = 'en'
);
