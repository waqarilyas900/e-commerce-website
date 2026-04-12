-- Profile demographics for storefront account settings.

alter table public.users
  add column if not exists gender text not null default '';

alter table public.users
  add column if not exists date_of_birth date null;

comment on column public.users.gender is
  'Customer gender: empty string or female, male, non_binary, prefer_not_to_say.';
comment on column public.users.date_of_birth is
  'Optional date of birth for personalization; null if not provided.';

-- Keep profiles view aligned with public.users (see 20260415220000_users_signup_provider.sql).
drop view if exists public.profiles;

create view public.profiles as
select
  id,
  auth_id,
  first_name,
  last_name,
  phone,
  gender,
  date_of_birth,
  signup_provider,
  created_at,
  updated_at
from public.users;

comment on view public.profiles is 'Customer profile; same rows as public.users (auth_id → auth.users).';
