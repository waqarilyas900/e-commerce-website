-- Block B Part 2: key route SEO upgrade (English)
-- Upgrades `seo_meta` rows for high-impact storefront routes while preserving
-- manually curated campaign copy whenever it doesn't match legacy/generic text.

with route_templates as (
  select *
  from (
    values
      (
        '/'::text,
        'Outflint - Stitching Accessories & Tailoring Tools Store | Outflint'::text,
        'Buy stitching accessories, tailoring tools, and sewing supplies online in Pakistan. Fast nationwide delivery and cash on delivery from Outflint.'::text,
        array['tailoring supplies pakistan','sewing accessories pakistan','stitching tools','dressmaking shop','outflint']::text[]
      ),
      (
        '/collections',
        'Shop Collections - Sewing & Tailoring Supplies Pakistan | Outflint',
        'Browse collections of sewing machine accessories, tailoring essentials, and dressmaking tools. Find the right products faster with organized categories.',
        array['sewing collections pakistan','tailoring supplies','dressmaking accessories','sewing machine parts','stitching accessories']::text[]
      ),
      (
        '/contact',
        'Contact Outflint - Tailoring Supplies Customer Support',
        'Need help with orders, product compatibility, or bulk stitching accessories? Contact Outflint support for fast assistance across Pakistan.',
        array['contact outflint','tailoring supplies support','customer service pakistan','sewing shop contact']::text[]
      ),
      (
        '/search',
        'Search Sewing & Tailoring Products | Outflint Pakistan',
        'Search our catalog for presser feet, sewing machine accessories, storage tools, and tailoring essentials. Find products quickly by keyword.',
        array['search sewing products','tailoring supplies search','presser foot pakistan','sewing accessories pakistan']::text[]
      )
  ) as t(subject_key, title_new, description_new, keywords_new)
)
update public.seo_meta sm
set
  title = case
    when btrim(sm.title) = ''
      or sm.title ilike 'Tailoring supplies & dressmaking essentials%'
      or sm.title ilike 'Shop collections - tailoring & sewing supplies%'
      or sm.title ilike 'Contact - tailoring supplies & customer support%'
      or sm.title ilike 'Search tailoring supplies & sewing notions%'
      or sm.title ilike 'Outflint || Home Page%'
      then rt.title_new
    else sm.title
  end,
  description = case
    when btrim(sm.description) = ''
      or sm.description ilike 'Shop tailoring supplies, dressmaking tools, sewing notions, and stitching accessories for alteration studios and home sewists - quality-focused essentials.%'
      or sm.description ilike 'Browse collections of tailoring supplies, sewing notions, and dressmaking materials - grouped so you can shop threads, tools, and accessories faster.%'
      or sm.description ilike 'Questions about orders, tailoring supplies, or wholesale stitching accessories?%'
      or sm.description ilike 'Find threads, needles, tailoring tools, and dressmaking accessories quickly.%'
      or sm.description ilike 'Present dapibus,%'
      then rt.description_new
    else sm.description
  end,
  keywords = case
    when sm.keywords is null or coalesce(array_length(sm.keywords, 1), 0) = 0
      then rt.keywords_new
    else sm.keywords
  end,
  updated_at = now()
from route_templates rt
where sm.subject_type = 'route'
  and sm.subject_key = rt.subject_key
  and sm.locale = 'en'
  and (
    btrim(sm.title) = ''
    or btrim(sm.description) = ''
    or sm.keywords is null
    or coalesce(array_length(sm.keywords, 1), 0) = 0
    or sm.title ilike 'Outflint || Home Page%'
    or sm.description ilike 'Present dapibus,%'
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
  'route'::text,
  null::uuid,
  rt.subject_key,
  'en'::text,
  rt.title_new,
  rt.description_new,
  rt.keywords_new,
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
      '/'::text,
      'Outflint - Stitching Accessories & Tailoring Tools Store | Outflint'::text,
      'Buy stitching accessories, tailoring tools, and sewing supplies online in Pakistan. Fast nationwide delivery and cash on delivery from Outflint.'::text,
      array['tailoring supplies pakistan','sewing accessories pakistan','stitching tools','dressmaking shop','outflint']::text[]
    ),
    (
      '/collections',
      'Shop Collections - Sewing & Tailoring Supplies Pakistan | Outflint',
      'Browse collections of sewing machine accessories, tailoring essentials, and dressmaking tools. Find the right products faster with organized categories.',
      array['sewing collections pakistan','tailoring supplies','dressmaking accessories','sewing machine parts','stitching accessories']::text[]
    ),
    (
      '/contact',
      'Contact Outflint - Tailoring Supplies Customer Support',
      'Need help with orders, product compatibility, or bulk stitching accessories? Contact Outflint support for fast assistance across Pakistan.',
      array['contact outflint','tailoring supplies support','customer service pakistan','sewing shop contact']::text[]
    ),
    (
      '/search',
      'Search Sewing & Tailoring Products | Outflint Pakistan',
      'Search our catalog for presser feet, sewing machine accessories, storage tools, and tailoring essentials. Find products quickly by keyword.',
      array['search sewing products','tailoring supplies search','presser foot pakistan','sewing accessories pakistan']::text[]
    )
) as rt(subject_key, title_new, description_new, keywords_new)
where not exists (
  select 1
  from public.seo_meta e
  where e.subject_type = 'route'
    and e.subject_key = rt.subject_key
    and e.locale = 'en'
);

