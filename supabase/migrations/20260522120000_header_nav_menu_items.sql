-- Dynamic header nav items (Store configuration): links to collections only; slug mirrors collection.slug.

create table if not exists public.header_nav_menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  label text not null,
  slug text not null,
  collection_id uuid not null references public.collections (id) on delete cascade,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint header_nav_menu_items_collection_id_key unique (collection_id),
  constraint header_nav_menu_items_slug_key unique (slug)
);

create index if not exists header_nav_menu_items_sort_idx
  on public.header_nav_menu_items (sort_order, label);

comment on table public.header_nav_menu_items is
  'Promo nav links to the right of Shop; destination is always /collections/{slug} from the assigned collection.';

comment on column public.header_nav_menu_items.name is
  'Internal admin title.';
comment on column public.header_nav_menu_items.label is
  'Visible label in the header (may include emoji).';
comment on column public.header_nav_menu_items.slug is
  'Mirrors collections.slug; set automatically from collection_id.';

create or replace function public.header_nav_menu_items_sync_from_collection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cslug text;
begin
  select c.slug into cslug
  from public.collections c
  where c.id = new.collection_id;

  if cslug is null then
    raise exception 'header_nav_menu_items: collection % not found', new.collection_id;
  end if;

  new.slug := cslug;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists header_nav_menu_items_sync_from_collection_trg on public.header_nav_menu_items;
create trigger header_nav_menu_items_sync_from_collection_trg
  before insert or update of collection_id on public.header_nav_menu_items
  for each row
  execute function public.header_nav_menu_items_sync_from_collection();

alter table public.header_nav_menu_items enable row level security;

-- Public storefront: active rows only
create policy "header_nav_menu_items_select_public"
  on public.header_nav_menu_items for select
  to anon, authenticated
  using (is_active = true);

-- Admins: full visibility for editing
create policy "header_nav_menu_items_select_admin"
  on public.header_nav_menu_items for select
  to authenticated
  using (public.is_active_admin());

create policy "header_nav_menu_items_insert_admin"
  on public.header_nav_menu_items for insert
  to authenticated
  with check (public.is_active_admin());

create policy "header_nav_menu_items_update_admin"
  on public.header_nav_menu_items for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "header_nav_menu_items_delete_admin"
  on public.header_nav_menu_items for delete
  to authenticated
  using (public.is_active_admin());
