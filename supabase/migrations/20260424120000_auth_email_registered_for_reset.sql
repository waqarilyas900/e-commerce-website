-- Used by POST /api/auth/forgot-password (service role only) before sending a reset email.

create or replace function public.auth_email_registered_for_reset(check_email text)
returns boolean
language sql
security definer
set search_path = auth, public
stable
as $$
  select exists(
    select 1
    from auth.users u
    where u.email is not null
      and lower(trim(u.email)) = lower(trim(check_email))
  );
$$;

revoke all on function public.auth_email_registered_for_reset(text) from public;
grant execute on function public.auth_email_registered_for_reset(text) to service_role;

comment on function public.auth_email_registered_for_reset(text) is
  'Returns true if auth.users has this email (for forgot-password pre-check). service_role only.';
