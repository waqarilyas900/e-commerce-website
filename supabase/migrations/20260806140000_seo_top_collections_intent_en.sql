-- Block B Part 3: top collection intent tuning (English)
-- Focus collections:
--   - presser-foot-collection
--   - stitching-accessories
--   - sewing-storage-and-organizer-cases
--
-- Goal: improve CTR + ranking intent on money category pages.

with top_collections as (
  select *
  from (
    values
      (
        'presser-foot-collection'::text,
        'Presser Foot Collection in Pakistan | Industrial Sewing Feet - Outflint'::text,
        'Shop industrial presser feet in Pakistan for hemming, ruffling, piping, and general stitching. Find compatible sewing machine feet with fast nationwide delivery.',
        array['presser foot pakistan','industrial sewing machine foot','hemming foot','ruffling foot','juki singer brother presser foot']::text[]
      ),
      (
        'stitching-accessories',
        'Stitching Accessories in Pakistan | Sewing Tools & Parts - Outflint',
        'Buy stitching accessories in Pakistan including needles, thread guides, seam rippers, and machine parts. Trusted quality with fast shipping and cash on delivery.',
        array['stitching accessories pakistan','sewing accessories pakistan','tailoring tools','sewing machine parts','dressmaking supplies']::text[]
      ),
      (
        'sewing-storage-and-organizer-cases',
        'Sewing Storage & Organizer Cases in Pakistan | Outflint',
        'Organize your sewing essentials with needle cases, bobbin boxes, and storage organizers. Shop practical sewing storage solutions in Pakistan with quick delivery.',
        array['sewing storage case pakistan','needle case','bobbin organizer','sewing accessories organizer','tailoring storage']::text[]
      )
  ) as t(slug, title_new, description_new, keywords_new)
)
update public.seo_meta sm
set
  title = tc.title_new,
  description = left(tc.description_new, 160),
  keywords = tc.keywords_new,
  updated_at = now()
from top_collections tc
join public.collections c on c.slug = tc.slug
where sm.subject_type = 'collection'
  and sm.subject_id = c.id
  and sm.locale = 'en';

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
  tc.title_new,
  left(tc.description_new, 160),
  tc.keywords_new,
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
      'presser-foot-collection'::text,
      'Presser Foot Collection in Pakistan | Industrial Sewing Feet - Outflint'::text,
      'Shop industrial presser feet in Pakistan for hemming, ruffling, piping, and general stitching. Find compatible sewing machine feet with fast nationwide delivery.',
      array['presser foot pakistan','industrial sewing machine foot','hemming foot','ruffling foot','juki singer brother presser foot']::text[]
    ),
    (
      'stitching-accessories',
      'Stitching Accessories in Pakistan | Sewing Tools & Parts - Outflint',
      'Buy stitching accessories in Pakistan including needles, thread guides, seam rippers, and machine parts. Trusted quality with fast shipping and cash on delivery.',
      array['stitching accessories pakistan','sewing accessories pakistan','tailoring tools','sewing machine parts','dressmaking supplies']::text[]
    ),
    (
      'sewing-storage-and-organizer-cases',
      'Sewing Storage & Organizer Cases in Pakistan | Outflint',
      'Organize your sewing essentials with needle cases, bobbin boxes, and storage organizers. Shop practical sewing storage solutions in Pakistan with quick delivery.',
      array['sewing storage case pakistan','needle case','bobbin organizer','sewing accessories organizer','tailoring storage']::text[]
    )
) as tc(slug, title_new, description_new, keywords_new)
join public.collections c on c.slug = tc.slug
where not exists (
  select 1
  from public.seo_meta e
  where e.subject_type = 'collection'
    and e.subject_id = c.id
    and e.locale = 'en'
);
