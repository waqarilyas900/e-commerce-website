-- Backfill blank public profile names from Google/Supabase auth metadata.
-- Fixes existing review rows that fall back to "Customer" because public.users names are empty.

with auth_name_parts as (
  select
    au.id as auth_id,
    nullif(trim(coalesce(au.raw_user_meta_data->>'first_name', '')), '') as meta_first,
    nullif(trim(coalesce(au.raw_user_meta_data->>'last_name', '')), '') as meta_last,
    nullif(trim(coalesce(au.raw_user_meta_data->>'given_name', '')), '') as given_name,
    nullif(trim(coalesce(au.raw_user_meta_data->>'family_name', '')), '') as family_name,
    nullif(trim(coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')), '') as full_name
  from auth.users au
),
derived_names as (
  select
    auth_id,
    case
      when meta_first is not null or meta_last is not null then coalesce(meta_first, '')
      when given_name is not null or family_name is not null then coalesce(given_name, '')
      when full_name is not null and strpos(full_name, ' ') > 0 then substr(full_name, 1, strpos(full_name, ' ') - 1)
      when full_name is not null then full_name
      else ''
    end as first_name,
    case
      when meta_first is not null or meta_last is not null then coalesce(meta_last, '')
      when given_name is not null or family_name is not null then coalesce(family_name, '')
      when full_name is not null and strpos(full_name, ' ') > 0 then trim(both from substr(full_name, strpos(full_name, ' ') + 1))
      else ''
    end as last_name
  from auth_name_parts
)
update public.users u
set
  first_name = case
    when nullif(trim(u.first_name), '') is null and d.first_name <> '' then d.first_name
    else u.first_name
  end,
  last_name = case
    when nullif(trim(u.last_name), '') is null and d.last_name <> '' then d.last_name
    else u.last_name
  end,
  updated_at = now()
from derived_names d
where u.auth_id = d.auth_id
  and (
    (nullif(trim(u.first_name), '') is null and d.first_name <> '')
    or
    (nullif(trim(u.last_name), '') is null and d.last_name <> '')
  );
