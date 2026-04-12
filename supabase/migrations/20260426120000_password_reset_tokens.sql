-- Opaque password-reset tokens (hashed). API uses service_role only.

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  token_sha256 text not null unique,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_auth_user_id_idx
  on public.password_reset_tokens (auth_user_id);

create index if not exists password_reset_tokens_expires_at_idx
  on public.password_reset_tokens (expires_at);

alter table public.password_reset_tokens enable row level security;

comment on table public.password_reset_tokens is
  'Opaque reset tokens (SHA-256 of secret). No client policies — service_role only.';

-- Resolve auth user id for forgot-password (service_role only).
create or replace function public.auth_user_id_by_email(check_email text)
returns uuid
language sql
security definer
set search_path = auth, public
stable
as $$
  select u.id
  from auth.users u
  where u.email is not null
    and lower(trim(u.email)) = lower(trim(check_email))
  limit 1;
$$;

revoke all on function public.auth_user_id_by_email(text) from public;
grant execute on function public.auth_user_id_by_email(text) to service_role;

comment on function public.auth_user_id_by_email(text) is
  'Returns auth.users.id for email, or null. service_role only.';

grant select, insert, update, delete on table public.password_reset_tokens to service_role;
