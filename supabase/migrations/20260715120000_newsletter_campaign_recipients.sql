-- Per-recipient rows for newsletter broadcast drill-down in admin.

create table if not exists public.newsletter_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.newsletter_campaigns (id) on delete cascade,
  email text not null,
  subscription_id uuid references public.newsletter_subscriptions (id) on delete set null,
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_campaign_recipients_campaign_id_idx
  on public.newsletter_campaign_recipients (campaign_id);

comment on table public.newsletter_campaign_recipients is
  'One row per recipient for each newsletter_campaign send (admin visibility).';

alter table public.newsletter_campaign_recipients enable row level security;

drop policy if exists "newsletter_campaign_recipients_select_admin" on public.newsletter_campaign_recipients;
create policy "newsletter_campaign_recipients_select_admin"
  on public.newsletter_campaign_recipients
  for select
  to authenticated
  using (public.is_active_admin());

drop policy if exists "newsletter_campaign_recipients_insert_admin" on public.newsletter_campaign_recipients;
create policy "newsletter_campaign_recipients_insert_admin"
  on public.newsletter_campaign_recipients
  for insert
  to authenticated
  with check (public.is_active_admin());

grant select, insert on table public.newsletter_campaign_recipients to authenticated;

-- Finalize campaign counts after send (insert-first flow)
drop policy if exists "newsletter_campaigns_update_admin" on public.newsletter_campaigns;
create policy "newsletter_campaigns_update_admin"
  on public.newsletter_campaigns
  for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

grant update on table public.newsletter_campaigns to authenticated;
