-- Newsletter opt-in at checkout (logged-in users) + token-based unsubscribe + admin visibility.

create table if not exists public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  email text not null,
  subscribed boolean not null default true,
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_subscriptions_user_id_key unique (user_id),
  constraint newsletter_subscriptions_unsubscribe_token_key unique (unsubscribe_token)
);

create index if not exists newsletter_subscriptions_subscribed_idx
  on public.newsletter_subscriptions (subscribed)
  where subscribed = true;

comment on table public.newsletter_subscriptions is
  'Marketing email list: one row per app user; opt-in via checkout RPC; opt-out only via unsubscribe_token.';

create or replace function public.touch_newsletter_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_newsletter_subscriptions_updated_at on public.newsletter_subscriptions;
create trigger trg_newsletter_subscriptions_updated_at
before update on public.newsletter_subscriptions
for each row execute procedure public.touch_newsletter_subscriptions_updated_at();

alter table public.newsletter_subscriptions enable row level security;

drop policy if exists "newsletter_subscriptions_select_admin" on public.newsletter_subscriptions;
create policy "newsletter_subscriptions_select_admin"
  on public.newsletter_subscriptions
  for select
  to authenticated
  using (public.is_active_admin());

drop policy if exists "newsletter_subscriptions_update_admin" on public.newsletter_subscriptions;
create policy "newsletter_subscriptions_update_admin"
  on public.newsletter_subscriptions
  for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

grant select, update on table public.newsletter_subscriptions to authenticated;

-- Checkout: opt-in for the current session (uses auth email; ignores client-supplied flags for trust).
create or replace function public.newsletter_subscribe_checkout()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user_id uuid;
  v_email text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select u.id into v_user_id from public.users u where u.auth_id = v_uid limit 1;
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_profile');
  end if;

  select nullif(trim(coalesce(au.email, '')), '') into v_email
  from auth.users au
  where au.id = v_uid
  limit 1;

  if v_email is null then
    return jsonb_build_object('ok', false, 'error', 'no_email');
  end if;

  insert into public.newsletter_subscriptions (user_id, email, subscribed)
  values (v_user_id, v_email, true)
  on conflict (user_id) do update set
    email = excluded.email,
    subscribed = public.newsletter_subscriptions.subscribed or excluded.subscribed,
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.newsletter_subscribe_checkout() is
  'Idempotent opt-in: creates row or sets subscribed=true; keeps existing token.';

-- Public unsubscribe (email link); token must match a row.
create or replace function public.newsletter_unsubscribe_by_token(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
  v_exists boolean;
begin
  if p_token is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select exists(
    select 1 from public.newsletter_subscriptions s where s.unsubscribe_token = p_token
  ) into v_exists;

  if not v_exists then
    return jsonb_build_object('ok', false, 'error', 'unknown_token');
  end if;

  update public.newsletter_subscriptions
  set subscribed = false
  where unsubscribe_token = p_token
    and subscribed = true;

  get diagnostics v_n = row_count;
  if v_n > 0 then
    return jsonb_build_object('ok', true, 'unsubscribed', true);
  end if;

  return jsonb_build_object('ok', true, 'already_unsubscribed', true);
end;
$$;

comment on function public.newsletter_unsubscribe_by_token(uuid) is
  'One-click unsubscribe for marketing emails; idempotent.';

grant execute on function public.newsletter_subscribe_checkout() to authenticated;
grant execute on function public.newsletter_unsubscribe_by_token(uuid) to anon;
grant execute on function public.newsletter_unsubscribe_by_token(uuid) to authenticated;
