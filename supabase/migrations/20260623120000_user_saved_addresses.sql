create table if not exists public.user_saved_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  shipping_street text not null default '',
  shipping_city text not null default '',
  shipping_postal_code text not null default '',
  shipping_province text not null default '',
  shipping_country text not null default 'PK',
  is_default boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_saved_addresses_user_id_idx
  on public.user_saved_addresses (user_id);

create index if not exists user_saved_addresses_recent_idx
  on public.user_saved_addresses (user_id, updated_at desc);

create unique index if not exists user_saved_addresses_one_default_per_user_idx
  on public.user_saved_addresses (user_id)
  where is_default;

create or replace function public.touch_user_saved_addresses_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_saved_addresses_updated_at on public.user_saved_addresses;
create trigger trg_user_saved_addresses_updated_at
before update on public.user_saved_addresses
for each row execute procedure public.touch_user_saved_addresses_updated_at();

alter table public.user_saved_addresses enable row level security;

drop policy if exists "user_saved_addresses_select_own" on public.user_saved_addresses;
create policy "user_saved_addresses_select_own"
  on public.user_saved_addresses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = user_saved_addresses.user_id
        and u.auth_id = auth.uid()
    )
  );

drop policy if exists "user_saved_addresses_insert_own" on public.user_saved_addresses;
create policy "user_saved_addresses_insert_own"
  on public.user_saved_addresses
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.users u
      where u.id = user_saved_addresses.user_id
        and u.auth_id = auth.uid()
    )
  );

drop policy if exists "user_saved_addresses_update_own" on public.user_saved_addresses;
create policy "user_saved_addresses_update_own"
  on public.user_saved_addresses
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = user_saved_addresses.user_id
        and u.auth_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.users u
      where u.id = user_saved_addresses.user_id
        and u.auth_id = auth.uid()
    )
  );

drop policy if exists "user_saved_addresses_delete_own" on public.user_saved_addresses;
create policy "user_saved_addresses_delete_own"
  on public.user_saved_addresses
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = user_saved_addresses.user_id
        and u.auth_id = auth.uid()
    )
  );
