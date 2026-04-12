-- Strongly typed gender on public.users (replaces free-form text from 20260416100000).

create type public.user_gender as enum (
  'unspecified',
  'female',
  'male',
  'non_binary',
  'prefer_not_to_say'
);

comment on type public.user_gender is
  'Customer gender; unspecified = not answered. App: lib/enums/user-gender.ts';

-- Must drop view first: profiles references users.gender; PG blocks ALTER TYPE on a depended column.
drop view if exists public.profiles;

alter table public.users
  alter column gender drop default;

alter table public.users
  alter column gender type public.user_gender
  using (
    case trim(coalesce(gender::text, ''))
      when '' then 'unspecified'::public.user_gender
      when 'female' then 'female'::public.user_gender
      when 'male' then 'male'::public.user_gender
      when 'non_binary' then 'non_binary'::public.user_gender
      when 'prefer_not_to_say' then 'prefer_not_to_say'::public.user_gender
      else 'unspecified'::public.user_gender
    end
  );

alter table public.users
  alter column gender set default 'unspecified'::public.user_gender;

comment on column public.users.gender is 'public.user_gender; default unspecified.';

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
