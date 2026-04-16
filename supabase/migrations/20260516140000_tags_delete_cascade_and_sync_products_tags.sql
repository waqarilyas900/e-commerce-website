-- Ensure tag_id FKs cascade on tag delete, and keep products.tags[] in sync when a tag row is removed.

-- ---------------------------------------------------------------------------
-- Rebind FKs to public.tags(id) with ON DELETE CASCADE (idempotent)
-- ---------------------------------------------------------------------------
do $fk$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.product_tags'::regclass
      and c.contype = 'f'
      and c.confrelid = 'public.tags'::regclass
  loop
    execute format('alter table public.product_tags drop constraint %I', r.conname);
  end loop;

  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.collection_tags'::regclass
      and c.contype = 'f'
      and c.confrelid = 'public.tags'::regclass
  loop
    execute format('alter table public.collection_tags drop constraint %I', r.conname);
  end loop;
end
$fk$;

alter table public.product_tags
  add constraint product_tags_tag_id_fkey
  foreign key (tag_id) references public.tags (id) on delete cascade;

alter table public.collection_tags
  add constraint collection_tags_tag_id_fkey
  foreign key (tag_id) references public.tags (id) on delete cascade;

comment on constraint product_tags_tag_id_fkey on public.product_tags is
  'Removing a tag deletes its product links (junction rows).';

comment on constraint collection_tags_tag_id_fkey on public.collection_tags is
  'Removing a tag deletes its collection links (junction rows).';

-- ---------------------------------------------------------------------------
-- Denormalized products.tags: remove the tag name when the tag row is deleted
-- (runs before the row is gone; CASCADE clears product_tags afterward).
-- ---------------------------------------------------------------------------
create or replace function public.tags_before_delete_strip_from_products_array()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products p
  set
    tags = array_remove(coalesce(p.tags, '{}'::text[]), old.name),
    updated_at = now()
  where old.name = any (coalesce(p.tags, '{}'::text[]));
  return old;
end;
$$;

drop trigger if exists tags_before_delete_strip_from_products_array on public.tags;

create trigger tags_before_delete_strip_from_products_array
  before delete on public.tags
  for each row
  execute procedure public.tags_before_delete_strip_from_products_array();

comment on function public.tags_before_delete_strip_from_products_array() is
  'Keeps products.tags text[] aligned when a normalized tag is deleted.';
