-- Singleton footer copy: customer care block heading (storefront + admin).
-- Drops legacy store_settings columns (favicon + JSON footer links + inline title).

create table if not exists public.footer_settings (
  id int primary key check (id = 1),
  customer_care_title text not null default 'Customer care',
  updated_at timestamptz not null default now()
);

insert into public.footer_settings (id, customer_care_title)
values (1, 'Customer care')
on conflict (id) do nothing;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'store_settings'
      and column_name = 'footer_customer_care_title'
  ) then
    update public.footer_settings fs
    set
      customer_care_title = coalesce(
        nullif(trim(ss.footer_customer_care_title), ''),
        'Customer care'
      ),
      updated_at = now()
    from public.store_settings ss
    where fs.id = 1
      and ss.id = 1;
  end if;
end $$;

alter table public.footer_settings enable row level security;

drop policy if exists "footer_settings_select_all" on public.footer_settings;
create policy "footer_settings_select_all"
  on public.footer_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "footer_settings_update_admin" on public.footer_settings;
create policy "footer_settings_update_admin"
  on public.footer_settings for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

comment on table public.footer_settings is
  'Singleton (id = 1). Heading above the Customer care links in the storefront footer.';

comment on column public.footer_settings.customer_care_title is
  'Shown above policy/footer links (after Contact us).';

-- Remove columns no longer used by the app (favicon via env; footer links via policy_pages).
alter table public.store_settings drop column if exists footer_policy_links;
alter table public.store_settings drop column if exists footer_customer_care_title;
alter table public.store_settings drop column if exists favicon_url;
