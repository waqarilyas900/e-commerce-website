-- Normalized tags, product↔tag, tag-based collections (OR tag match). Backfills from products.tags text[].

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_name_key unique (name),
  constraint tags_name_lower_slug check (name = lower(trim(name)))
);

create index if not exists tags_name_idx on public.tags (name);

comment on table public.tags is 'Catalog tags; name is unique lowercase slug, label is admin/storefront display.';

-- ---------------------------------------------------------------------------
-- Product ↔ Tag (many-to-many)
-- ---------------------------------------------------------------------------
create table if not exists public.product_tags (
  product_id uuid not null references public.products (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, tag_id)
);

create index if not exists product_tags_tag_id_idx on public.product_tags (tag_id);

-- ---------------------------------------------------------------------------
-- Collection membership mode (Postgres enum — not unconstrained text)
-- ---------------------------------------------------------------------------
do $enum$
begin
  create type public.collection_type as enum (
    'manual',
    'tag_based'
  );
exception
  when duplicate_object then null;
end
$enum$;

comment on type public.collection_type is
  'manual: product_collections links. tag_based: dynamic via collection_tags + product_tags (OR).';

do $col$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'collections'
      and column_name = 'collection_type'
  ) then
    alter table public.collections
      add column collection_type public.collection_type
        not null default 'manual'::public.collection_type;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'collections'
      and column_name = 'collection_type'
      and data_type = 'text'
  ) then
    alter table public.collections
      drop constraint if exists collections_collection_type_check;
    alter table public.collections
      alter column collection_type drop default;
    alter table public.collections
      alter column collection_type type public.collection_type
      using (
        case lower(trim(collection_type::text))
          when 'tag_based' then 'tag_based'::public.collection_type
          else 'manual'::public.collection_type
        end
      );
    alter table public.collections
      alter column collection_type set default 'manual'::public.collection_type;
    alter table public.collections
      alter column collection_type set not null;
  end if;
end
$col$;

comment on column public.collections.collection_type is
  'Uses enum public.collection_type (manual vs tag_based).';

create table if not exists public.collection_tags (
  collection_id uuid not null references public.collections (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, tag_id)
);

create index if not exists collection_tags_tag_id_idx on public.collection_tags (tag_id);

-- ---------------------------------------------------------------------------
-- Backfill from legacy products.tags text[]
-- ---------------------------------------------------------------------------
create or replace function public._tag_slug_from_legacy_text(t text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '-' from lower(regexp_replace(trim(t), '\s+', '-', 'g'))),
    ''
  );
$$;

insert into public.tags (name, label)
select slug, min(trim(raw)) as label
from (
  select
    public._tag_slug_from_legacy_text(u.t) as slug,
    u.t as raw
  from public.products p
  cross join lateral unnest(coalesce(p.tags, array[]::text[])) as u(t)
) x
where slug is not null
group by slug
on conflict (name) do nothing;

insert into public.product_tags (product_id, tag_id)
select p.id, tg.id
from public.products p
cross join lateral unnest(coalesce(p.tags, array[]::text[])) as u(t)
join public.tags tg on tg.name = public._tag_slug_from_legacy_text(u.t)
where public._tag_slug_from_legacy_text(u.t) is not null
on conflict (product_id, tag_id) do nothing;

drop function if exists public._tag_slug_from_legacy_text(text);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.tags enable row level security;
alter table public.product_tags enable row level security;
alter table public.collection_tags enable row level security;

create policy "tags_select_all"
  on public.tags for select
  to anon, authenticated
  using (true);

create policy "tags_insert_admin"
  on public.tags for insert
  to authenticated
  with check (public.is_active_admin());

create policy "tags_update_admin"
  on public.tags for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "tags_delete_admin"
  on public.tags for delete
  to authenticated
  using (public.is_active_admin());

create policy "product_tags_select_public_or_admin"
  on public.product_tags for select
  to anon, authenticated
  using (
    public.is_active_admin()
    or exists (
      select 1 from public.products p
      where p.id = product_tags.product_id
        and p.status = 'active'
    )
  );

create policy "product_tags_insert_admin"
  on public.product_tags for insert
  to authenticated
  with check (public.is_active_admin());

create policy "product_tags_delete_admin"
  on public.product_tags for delete
  to authenticated
  using (public.is_active_admin());

create policy "collection_tags_select_all"
  on public.collection_tags for select
  to anon, authenticated
  using (true);

create policy "collection_tags_insert_admin"
  on public.collection_tags for insert
  to authenticated
  with check (public.is_active_admin());

create policy "collection_tags_delete_admin"
  on public.collection_tags for delete
  to authenticated
  using (public.is_active_admin());
