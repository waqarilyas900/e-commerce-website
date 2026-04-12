-- Run this in Supabase: SQL Editor → New query → Paste → Run
-- Or: supabase db push (if using Supabase CLI linked to this project)

-- Profile row per auth user (foreign key to auth.users)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_auth_id_key unique (auth_id)
);

create index if not exists users_auth_id_idx on public.users (auth_id);

alter table public.users enable row level security;

-- Signed-in users can read their own row
create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using (auth.uid() = auth_id);

-- Signed-in users can update their own row
create policy "users_update_own"
  on public.users
  for update
  to authenticated
  using (auth.uid() = auth_id)
  with check (auth.uid() = auth_id);

-- Backup: if the trigger is delayed, client can upsert right after signup (session required)
create policy "users_insert_own"
  on public.users
  for insert
  to authenticated
  with check (auth.uid() = auth_id);

comment on table public.users is 'App profile; auth_id references auth.users(id).';

-- Copy first_name, last_name, phone from signUp user_metadata (raw_user_meta_data)
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (auth_id, first_name, last_name, phone)
  values (
    new.id,
    coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'first_name', '')), ''), ''),
    coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'last_name', '')), ''), ''),
    coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''), '')
  )
  on conflict (auth_id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_auth_user();
