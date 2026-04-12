-- Track how the account was first created (email vs google, etc.) for analytics and support.
-- Canonical provider list: auth.identities — we mirror the *first* identity into public.users.signup_provider.

alter table public.users
  add column if not exists signup_provider text not null default 'unknown';

comment on column public.users.signup_provider is
  'Auth provider used at first sign-up (matches first auth.identities.provider: email, google, …). Join auth.users / auth.identities for full history.';

create index if not exists users_signup_provider_idx on public.users (signup_provider);

-- When the first identity row is inserted, set signup_provider (subsequent linked identities do not change it).
create or replace function public.sync_users_signup_provider_from_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  select count(*)::int into n
  from auth.identities
  where user_id = new.user_id;

  if n = 1 then
    update public.users
    set
      signup_provider = new.provider::text,
      updated_at = now()
    where auth_id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_identity_set_signup_provider on auth.identities;

create trigger on_identity_set_signup_provider
  after insert on auth.identities
  for each row
  execute procedure public.sync_users_signup_provider_from_identity();

-- Backfill from earliest identity per user (first sign-in method).
update public.users u
set
  signup_provider = i.provider::text,
  updated_at = now()
from (
  select distinct on (user_id) user_id, provider
  from auth.identities
  order by user_id, created_at asc nulls last
) i
where u.auth_id = i.user_id
  and u.signup_provider = 'unknown';

-- Expose on profiles view (drop first: CREATE OR REPLACE cannot add columns mid-list vs existing view)
drop view if exists public.profiles;

create view public.profiles as
select
  id,
  auth_id,
  first_name,
  last_name,
  phone,
  signup_provider,
  created_at,
  updated_at
from public.users;

comment on view public.profiles is 'Customer profile; same rows as public.users (auth_id → auth.users).';
