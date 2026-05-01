-- Backfill English text SEO in public.seo_meta for products and collections
-- when title, description, or keywords are missing. Does NOT set og_image_url,
-- og_image_alt, or canonical_url (leave defaults / storefront fallbacks).
--
-- Idempotent for re-run on new rows only; existing non-empty values are preserved.

-- ---------------------------------------------------------------------------
-- Products: update existing seo_meta rows with any empty text fields
-- ---------------------------------------------------------------------------
update public.seo_meta sm
set
  title = case
    when btrim(sm.title) = '' then left(btrim(p.name), 500)
    else sm.title
  end,
  description = case
    when btrim(sm.description) = '' then left(
      case
        when length(x.plain) < 100 then
          x.plain
          || ' Tailoring supplies and sewing notions for dressmaking, alterations, and professional stitching.'
        else x.plain
      end,
      160
    )
    else sm.description
  end,
  keywords = case
    when sm.keywords is null
      or coalesce(array_length(sm.keywords, 1), 0) = 0
    then array[
      'tailoring supplies',
      'sewing accessories',
      'dressmaking',
      'stitching supplies',
      'alteration essentials'
    ]::text[]
    else sm.keywords
  end,
  updated_at = now()
from public.products p,
lateral (
  select coalesce(
    nullif(
      trim(
        regexp_replace(
          regexp_replace(coalesce(p.description, ''), '<[^>]+>', ' ', 'gi'),
          '\s+',
          ' ',
          'g'
        )
      ),
      ''
    ),
    nullif(trim(p.short_description), ''),
    trim(p.name)
  ) as plain
) x
where sm.subject_type = 'product'
  and sm.subject_id = p.id
  and sm.locale = 'en'
  and (
    btrim(sm.title) = ''
    or btrim(sm.description) = ''
    or sm.keywords is null
    or coalesce(array_length(sm.keywords, 1), 0) = 0
  );

-- Products: insert seo_meta where no 'en' row exists yet
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
  left(btrim(p.name), 500),
  left(
    case
      when length(x.plain) < 100 then
        x.plain
        || ' Tailoring supplies and sewing notions for dressmaking, alterations, and professional stitching.'
      else x.plain
    end,
    160
  ),
  array[
    'tailoring supplies',
    'sewing accessories',
    'dressmaking',
    'stitching supplies',
    'alteration essentials'
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
cross join lateral (
  select coalesce(
    nullif(
      trim(
        regexp_replace(
          regexp_replace(coalesce(p.description, ''), '<[^>]+>', ' ', 'gi'),
          '\s+',
          ' ',
          'g'
        )
      ),
      ''
    ),
    nullif(trim(p.short_description), ''),
    trim(p.name)
  ) as plain
) x
where not exists (
  select 1
  from public.seo_meta e
  where e.subject_type = 'product'
    and e.subject_id = p.id
    and e.locale = 'en'
);

-- ---------------------------------------------------------------------------
-- Collections: update existing rows with empty text fields
-- ---------------------------------------------------------------------------
update public.seo_meta sm
set
  title = case
    when btrim(sm.title) = '' then left(btrim(c.name), 500)
    else sm.title
  end,
  description = case
    when btrim(sm.description) = '' then left(
      case
        when length(y.plain) < 100 then
          y.plain
          || ' Browse tailoring supplies, sewing notions, and stitching accessories in this collection.'
        else y.plain
      end,
      160
    )
    else sm.description
  end,
  keywords = case
    when sm.keywords is null
      or coalesce(array_length(sm.keywords, 1), 0) = 0
    then array[
      'tailoring supplies',
      'sewing collection',
      'dressmaking',
      'stitching accessories'
    ]::text[]
    else sm.keywords
  end,
  updated_at = now()
from public.collections c,
lateral (
  select coalesce(
    nullif(
      trim(
        regexp_replace(
          regexp_replace(coalesce(c.description, ''), '<[^>]+>', ' ', 'gi'),
          '\s+',
          ' ',
          'g'
        )
      ),
      ''
    ),
    trim(c.name)
  ) as plain
) y
where sm.subject_type = 'collection'
  and sm.subject_id = c.id
  and sm.locale = 'en'
  and (
    btrim(sm.title) = ''
    or btrim(sm.description) = ''
    or sm.keywords is null
    or coalesce(array_length(sm.keywords, 1), 0) = 0
  );

-- Collections: insert where missing
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
  left(btrim(c.name), 500),
  left(
    case
      when length(y.plain) < 100 then
        y.plain
        || ' Browse tailoring supplies, sewing notions, and stitching accessories in this collection.'
      else y.plain
    end,
    160
  ),
  array[
    'tailoring supplies',
    'sewing collection',
    'dressmaking',
    'stitching accessories'
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
cross join lateral (
  select coalesce(
    nullif(
      trim(
        regexp_replace(
          regexp_replace(coalesce(c.description, ''), '<[^>]+>', ' ', 'gi'),
          '\s+',
          ' ',
          'g'
        )
      ),
      ''
    ),
    trim(c.name)
  ) as plain
) y
where not exists (
  select 1
  from public.seo_meta e
  where e.subject_type = 'collection'
    and e.subject_id = c.id
    and e.locale = 'en'
);
