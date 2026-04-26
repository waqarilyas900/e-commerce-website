-- PostgREST upsert (ON CONFLICT) cannot use deferrable unique constraints as arbiters
-- (PostgreSQL 55000). Recreate seo_meta uniques as immediate constraints.

alter table public.seo_meta
  drop constraint if exists seo_meta_subject_id_locale_uniq;

alter table public.seo_meta
  drop constraint if exists seo_meta_subject_key_locale_uniq;

alter table public.seo_meta
  add constraint seo_meta_subject_id_locale_uniq
    unique (subject_type, subject_id, locale);

alter table public.seo_meta
  add constraint seo_meta_subject_key_locale_uniq
    unique (subject_type, subject_key, locale);
