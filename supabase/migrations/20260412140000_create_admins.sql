-- Admin accounts: linked to auth.users; email + status for the admin panel.

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admins_auth_id_key unique (auth_id),
  constraint admins_email_key unique (email)
);

create index if not exists admins_auth_id_idx on public.admins (auth_id);
create index if not exists admins_email_idx on public.admins (lower(email));

alter table public.admins enable row level security;

-- Signed-in user can read their own admin row (e.g. “is this user an active admin?”)
create policy "admins_select_own"
  on public.admins
  for select
  to authenticated
  using (auth.uid() = auth_id);

comment on table public.admins is 'Store admins; auth_id references auth.users(id).';
