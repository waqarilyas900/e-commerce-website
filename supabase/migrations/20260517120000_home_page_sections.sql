-- Configurable homepage product rails: named sections, unique slug, optional tags (OR), sort order, active flag.

create table if not exists public.home_page_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_page_sections_name_key unique (name),
  constraint home_page_sections_slug_key unique (slug),
  constraint home_page_sections_slug_format check (slug = lower(trim(slug)) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists home_page_sections_sort_idx
  on public.home_page_sections (sort_order, id);

comment on table public.home_page_sections is
  'Homepage product rails; each row is one section with a unique slug for /s/{slug} view-all.';

create table if not exists public.home_page_section_tags (
  section_id uuid not null references public.home_page_sections (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (section_id, tag_id)
);

create index if not exists home_page_section_tags_tag_id_idx
  on public.home_page_section_tags (tag_id);

comment on table public.home_page_section_tags is
  'Tags assigned to a homepage section; storefront uses OR (any matching tag).';

alter table public.home_page_sections enable row level security;
alter table public.home_page_section_tags enable row level security;

create policy "home_page_sections_select_public_or_admin"
  on public.home_page_sections for select
  to anon, authenticated
  using (is_active = true or public.is_active_admin());

create policy "home_page_sections_mutate_admin"
  on public.home_page_sections for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "home_page_section_tags_select_public_or_admin"
  on public.home_page_section_tags for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.home_page_sections s
      where s.id = home_page_section_tags.section_id
        and (s.is_active = true or public.is_active_admin())
    )
  );

create policy "home_page_section_tags_mutate_admin"
  on public.home_page_section_tags for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());
