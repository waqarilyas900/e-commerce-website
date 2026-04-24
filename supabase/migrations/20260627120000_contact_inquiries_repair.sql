-- Repair / idempotent apply: fixes "Could not find the table 'public.contact_inquiries' in the schema cache"
-- when the DB never had the earlier migration, or PostgREST needs a schema reload after DDL.

create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  from_name text not null,
  from_email text not null,
  message text not null,
  image_urls jsonb not null default '[]'::jsonb,
  email_sent boolean not null default false,
  email_error text
);

create index if not exists contact_inquiries_created_at_idx
  on public.contact_inquiries (created_at desc);

comment on table public.contact_inquiries is
  'Public contact form messages + optional image URLs; admins read via RLS; API writes with service role.';

alter table public.contact_inquiries enable row level security;

drop policy if exists "contact_inquiries_select_admin" on public.contact_inquiries;

create policy "contact_inquiries_select_admin"
  on public.contact_inquiries
  for select
  to authenticated
  using (public.is_active_admin());

-- Explicit API access (covers edge cases where default grants differ)
grant select on table public.contact_inquiries to authenticated;
grant insert, select on table public.contact_inquiries to service_role;

notify pgrst, 'reload schema';
