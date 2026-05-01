-- Extended English SEO backfill (text only — no OG image URLs):
--   • public.seo_meta: policy_page, home_section, key storefront routes
--   • public.product_assets: empty alt_text on images → product name + context
-- Only fills missing / empty fields; never overwrites non-empty values.

-- ---------------------------------------------------------------------------
-- 1) Product gallery images: alt text when blank (accessibility + image SEO)
-- ---------------------------------------------------------------------------
update public.product_assets pa
set alt_text = left(
  btrim(p.name)
  || case
    when pa.sort_order = 0 then ' — primary product photo'
    else ' — product gallery image'
  end,
  500
)
from public.products p
where pa.product_id = p.id
  and pa.kind = 'image'
  and btrim(pa.alt_text) = '';

-- ---------------------------------------------------------------------------
-- 2) Policy pages → seo_meta (subject_type = policy_page, locale = en)
-- ---------------------------------------------------------------------------
update public.seo_meta sm
set
  title = case
    when btrim(sm.title) = '' then left(btrim(pp.title), 500)
    else sm.title
  end,
  description = case
    when btrim(sm.description) = '' then left(
      case
        when length(z.plain) < 100 then
          z.plain
          || ' Official policy for our tailoring supplies store: shipping, returns, and customer care.'
        else z.plain
      end,
      160
    )
    else sm.description
  end,
  keywords = case
    when sm.keywords is null
      or coalesce(array_length(sm.keywords, 1), 0) = 0
    then array[
      'store policy',
      'tailoring supplies',
      'customer information',
      'shipping and returns'
    ]::text[]
    else sm.keywords
  end,
  updated_at = now()
from public.policy_pages pp,
lateral (
  select coalesce(
    nullif(
      trim(
        regexp_replace(
          regexp_replace(coalesce(pp.content_html, ''), '<[^>]+>', ' ', 'gi'),
          '\s+',
          ' ',
          'g'
        )
      ),
      ''
    ),
    btrim(pp.title)
  ) as plain
) z
where sm.subject_type = 'policy_page'
  and sm.subject_id = pp.id
  and sm.locale = 'en'
  and (
    btrim(sm.title) = ''
    or btrim(sm.description) = ''
    or sm.keywords is null
    or coalesce(array_length(sm.keywords, 1), 0) = 0
  );

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
  'policy_page'::text,
  pp.id,
  null::text,
  'en'::text,
  left(btrim(pp.title), 500),
  left(
    case
      when length(z.plain) < 100 then
        z.plain
        || ' Official policy for our tailoring supplies store: shipping, returns, and customer care.'
      else z.plain
    end,
    160
  ),
  array[
    'store policy',
    'tailoring supplies',
    'customer information',
    'shipping and returns'
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
from public.policy_pages pp
cross join lateral (
  select coalesce(
    nullif(
      trim(
        regexp_replace(
          regexp_replace(coalesce(pp.content_html, ''), '<[^>]+>', ' ', 'gi'),
          '\s+',
          ' ',
          'g'
        )
      ),
      ''
    ),
    btrim(pp.title)
  ) as plain
) z
where not exists (
  select 1
  from public.seo_meta e
  where e.subject_type = 'policy_page'
    and e.subject_id = pp.id
    and e.locale = 'en'
);

-- ---------------------------------------------------------------------------
-- 3) Homepage sections (/s/[slug]) → seo_meta (home_section)
-- ---------------------------------------------------------------------------
update public.seo_meta sm
set
  title = case
    when btrim(sm.title) = '' then left(btrim(h.name), 500)
    else sm.title
  end,
  description = case
    when btrim(sm.description) = '' then left(
      btrim(h.name)
      || ' — curated tailoring supplies, dressmaking notions, and stitching accessories from this featured shop section.',
      160
    )
    else sm.description
  end,
  keywords = case
    when sm.keywords is null
      or coalesce(array_length(sm.keywords, 1), 0) = 0
    then array[
      'tailoring supplies',
      'homepage picks',
      'dressmaking',
      'sewing notions'
    ]::text[]
    else sm.keywords
  end,
  updated_at = now()
from public.home_page_sections h
where sm.subject_type = 'home_section'
  and sm.subject_id = h.id
  and sm.locale = 'en'
  and (
    btrim(sm.title) = ''
    or btrim(sm.description) = ''
    or sm.keywords is null
    or coalesce(array_length(sm.keywords, 1), 0) = 0
  );

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
  'home_section'::text,
  h.id,
  null::text,
  'en'::text,
  left(btrim(h.name), 500),
  left(
    btrim(h.name)
    || ' — curated tailoring supplies, dressmaking notions, and stitching accessories from this featured shop section.',
    160
  ),
  array[
    'tailoring supplies',
    'homepage picks',
    'dressmaking',
    'sewing notions'
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
from public.home_page_sections h
where not exists (
  select 1
  from public.seo_meta e
  where e.subject_type = 'home_section'
    and e.subject_id = h.id
    and e.locale = 'en'
);

-- ---------------------------------------------------------------------------
-- 4) Key routes (/, /search, /contact, /collections) — seo_meta.subject_key
-- ---------------------------------------------------------------------------
update public.seo_meta sm
set
  title = case
    when btrim(sm.title) = '' then left(
      case sm.subject_key
        when '/' then
          coalesce(
            nullif((select btrim(site_title) from public.store_settings where id = 1 limit 1), ''),
            'Tailoring supplies & dressmaking essentials'
          )
        when '/search' then 'Search tailoring supplies & sewing notions'
        when '/contact' then 'Contact — tailoring supplies & customer support'
        when '/collections' then 'Shop collections — tailoring & sewing supplies'
        else btrim(sm.title)
      end,
      500
    )
    else sm.title
  end,
  description = case
    when btrim(sm.description) = '' then left(
      case sm.subject_key
        when '/' then
          coalesce(
            nullif((select btrim(site_description) from public.store_settings where id = 1 limit 1), ''),
            'Shop tailoring supplies, dressmaking tools, sewing notions, and stitching accessories for alteration studios and home sewists — quality-focused essentials.'
          )
        when '/search' then
          'Find threads, needles, tailoring tools, and dressmaking accessories quickly. Search our catalog of professional-grade stitching supplies.'
        when '/contact' then
          'Questions about orders, tailoring supplies, or wholesale stitching accessories? Reach our team for help with dressmaking and alteration product recommendations.'
        when '/collections' then
          'Browse collections of tailoring supplies, sewing notions, and dressmaking materials — grouped so you can shop threads, tools, and accessories faster.'
        else btrim(sm.description)
      end,
      160
    )
    else sm.description
  end,
  keywords = case
    when sm.keywords is null
      or coalesce(array_length(sm.keywords, 1), 0) = 0
    then case sm.subject_key
      when '/' then array[
        'tailoring supplies',
        'dressmaking',
        'sewing shop',
        'stitching accessories'
      ]::text[]
      when '/search' then array[
        'search tailoring supplies',
        'sewing notions',
        'dressmaking tools'
      ]::text[]
      when '/contact' then array[
        'customer support',
        'tailoring supplies store',
        'contact'
      ]::text[]
      when '/collections' then array[
        'tailoring collections',
        'sewing supplies',
        'dressmaking shop'
      ]::text[]
      else sm.keywords
    end
    else sm.keywords
  end,
  updated_at = now()
where sm.subject_type = 'route'
  and sm.locale = 'en'
  and sm.subject_key in ('/', '/search', '/contact', '/collections')
  and (
    btrim(sm.title) = ''
    or btrim(sm.description) = ''
    or sm.keywords is null
    or coalesce(array_length(sm.keywords, 1), 0) = 0
  );

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
  v.subject_type,
  v.subject_id,
  v.subject_key,
  v.locale,
  v.title,
  v.description,
  v.keywords,
  '',
  '',
  '',
  null,
  null,
  'summary_large_image'::text,
  false,
  false,
  '{}'::jsonb
from (
  values
    (
      'route'::text,
      null::uuid,
      '/'::text,
      'en'::text,
      coalesce(
        (select coalesce(nullif(btrim(site_title), ''), 'Tailoring supplies & dressmaking essentials') from public.store_settings where id = 1 limit 1),
        'Tailoring supplies & dressmaking essentials'
      ),
      left(
        coalesce(
          (select coalesce(nullif(btrim(site_description), ''), 'Shop tailoring supplies, dressmaking tools, sewing notions, and stitching accessories for alteration studios and home sewists — quality-focused essentials.') from public.store_settings where id = 1 limit 1),
          'Shop tailoring supplies, dressmaking tools, sewing notions, and stitching accessories for alteration studios and home sewists — quality-focused essentials.'
        ),
        160
      ),
      array['tailoring supplies', 'dressmaking', 'sewing shop', 'stitching accessories']::text[]
    ),
    (
      'route',
      null,
      '/search',
      'en',
      'Search tailoring supplies & sewing notions',
      'Find threads, needles, tailoring tools, and dressmaking accessories quickly. Search our catalog of professional-grade stitching supplies.',
      array['search tailoring supplies', 'sewing notions', 'dressmaking tools']::text[]
    ),
    (
      'route',
      null,
      '/contact',
      'en',
      'Contact — tailoring supplies & customer support',
      'Questions about orders, tailoring supplies, or wholesale stitching accessories? Reach our team for help with dressmaking and alteration product recommendations.',
      array['customer support', 'tailoring supplies store', 'contact']::text[]
    ),
    (
      'route',
      null,
      '/collections',
      'en',
      'Shop collections — tailoring & sewing supplies',
      'Browse collections of tailoring supplies, sewing notions, and dressmaking materials — grouped so you can shop threads, tools, and accessories faster.',
      array['tailoring collections', 'sewing supplies', 'dressmaking shop']::text[]
    )
) as v(subject_type, subject_id, subject_key, locale, title, description, keywords)
where not exists (
  select 1
  from public.seo_meta e
  where e.subject_type = 'route'
    and e.subject_key = v.subject_key
    and e.locale = v.locale
);
