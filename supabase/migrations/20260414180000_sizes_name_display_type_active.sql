-- Sizes: internal name, display label, numeric vs text, active flag.

alter table public.sizes
  add column if not exists name text,
  add column if not exists display_name text,
  add column if not exists size_type text not null default 'text',
  add column if not exists is_active boolean not null default true;

update public.sizes
set display_name = label
where display_name is null
  and label is not null;

update public.sizes
set display_name = 'Size'
where display_name is null;

-- Stable unique internal keys: slug fragment + id prefix
-- Guaranteed unique + valid internal pattern (letter prefix)
update public.sizes
set name = 'size_' || replace(id::text, '-', '')
where name is null or trim(name) = '';

alter table public.sizes
  alter column display_name set not null,
  alter column name set not null;

alter table public.sizes
  drop constraint if exists sizes_size_type_check;

alter table public.sizes
  add constraint sizes_size_type_check check (size_type in ('numeric', 'text'));

alter table public.sizes
  drop constraint if exists sizes_name_unique;

alter table public.sizes
  add constraint sizes_name_unique unique (name);

alter table public.sizes
  drop column if exists label;

comment on column public.sizes.name is 'Unique internal key (slug-safe) for logic and imports.';
comment on column public.sizes.display_name is 'Human label in admin pickers and variant option_values.size.';
comment on column public.sizes.size_type is 'text (S/M/L) vs numeric (shoe/measurement) for UI hints.';
comment on column public.sizes.is_active is 'Inactive sizes stay on saved variants but are hidden from new picks.';
