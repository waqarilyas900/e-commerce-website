-- Guests: nullable user_id + unique normalized email; resubscribe token; campaigns log; service-role checkout subscribe.

-- 1) Resubscribe token (separate from unsubscribe for safer links)
alter table public.newsletter_subscriptions
  add column if not exists resubscribe_token uuid;

update public.newsletter_subscriptions
set resubscribe_token = gen_random_uuid()
where resubscribe_token is null;

alter table public.newsletter_subscriptions
  alter column resubscribe_token set default gen_random_uuid(),
  alter column resubscribe_token set not null;

drop index if exists newsletter_subscriptions_resubscribe_token_uidx;
create unique index newsletter_subscriptions_resubscribe_token_uidx
  on public.newsletter_subscriptions (resubscribe_token);

-- 2) One row per normalized email; user_id optional (guests)
alter table public.newsletter_subscriptions drop constraint if exists newsletter_subscriptions_user_id_key;

drop index if exists newsletter_subscriptions_user_id_uidx;
create unique index newsletter_subscriptions_user_id_uidx
  on public.newsletter_subscriptions (user_id)
  where user_id is not null;

alter table public.newsletter_subscriptions alter column user_id drop not null;

drop index if exists newsletter_subscriptions_email_norm_uidx;
alter table public.newsletter_subscriptions drop constraint if exists newsletter_subscriptions_email_norm_key;

-- Expression uniqueness: use a unique index (PostgreSQL does not accept UNIQUE ((expr)) via ADD CONSTRAINT).
create unique index newsletter_subscriptions_email_norm_uidx
  on public.newsletter_subscriptions (lower(trim(email)));

comment on table public.newsletter_subscriptions is
  'Marketing list: unique by lower(email). user_id set for accounts, null for guest checkout opt-in.';

-- 3) Campaigns / analytics (admin-composed sends)
create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body_html text not null,
  recipient_count int not null default 0,
  sent_ok int not null default 0,
  sent_failed int not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by_auth_id uuid
);

comment on table public.newsletter_campaigns is
  'Broadcast history from admin panel send (counts only; no per-recipient log in v1).';

alter table public.newsletter_campaigns enable row level security;

drop policy if exists "newsletter_campaigns_select_admin" on public.newsletter_campaigns;
create policy "newsletter_campaigns_select_admin"
  on public.newsletter_campaigns
  for select
  to authenticated
  using (public.is_active_admin());

drop policy if exists "newsletter_campaigns_insert_admin" on public.newsletter_campaigns;
create policy "newsletter_campaigns_insert_admin"
  on public.newsletter_campaigns
  for insert
  to authenticated
  with check (public.is_active_admin());

grant select, insert on table public.newsletter_campaigns to authenticated;

-- 4) Replace checkout subscribe: server-only (service_role) after successful order
drop function if exists public.newsletter_subscribe_checkout();

create or replace function public.newsletter_subscribe_after_order(p_email text, p_auth_uid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw text := trim(coalesce(p_email, ''));
  v_norm text := lower(v_raw);
  v_user_id uuid;
begin
  if v_norm is null or length(v_norm) < 3 or position('@' in v_norm) < 2 then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  if p_auth_uid is not null then
    select u.id into v_user_id from public.users u where u.auth_id = p_auth_uid limit 1;
  else
    v_user_id := null;
  end if;

  insert into public.newsletter_subscriptions (user_id, email, subscribed)
  values (v_user_id, v_raw, true)
  on conflict ((lower(trim(email)))) do update set
    user_id = coalesce(excluded.user_id, public.newsletter_subscriptions.user_id),
    email = excluded.email,
    subscribed = public.newsletter_subscriptions.subscribed or excluded.subscribed,
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.newsletter_subscribe_after_order(text, uuid) is
  'After order: opt-in marketing. Call with service_role only. p_auth_uid null = guest.';

revoke all on function public.newsletter_subscribe_after_order(text, uuid) from PUBLIC;
grant execute on function public.newsletter_subscribe_after_order(text, uuid) to service_role;

-- 5) Re-subscribe via email link (separate token)
create or replace function public.newsletter_resubscribe_by_token(p_token uuid)
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
    select 1 from public.newsletter_subscriptions s where s.resubscribe_token = p_token
  ) into v_exists;

  if not v_exists then
    return jsonb_build_object('ok', false, 'error', 'unknown_token');
  end if;

  update public.newsletter_subscriptions
  set subscribed = true
  where resubscribe_token = p_token
    and subscribed = false;

  get diagnostics v_n = row_count;
  if v_n > 0 then
    return jsonb_build_object('ok', true, 'resubscribed', true);
  end if;

  return jsonb_build_object('ok', true, 'already_subscribed', true);
end;
$$;

comment on function public.newsletter_resubscribe_by_token(uuid) is
  'Marketing re-opt-in from email link; idempotent.';

grant execute on function public.newsletter_resubscribe_by_token(uuid) to anon;
grant execute on function public.newsletter_resubscribe_by_token(uuid) to authenticated;
