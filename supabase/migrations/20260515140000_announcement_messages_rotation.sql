-- Multiple rotating announcement messages + interval (ms).

alter table public.home_page_settings
  add column if not exists announcement_messages jsonb not null default '[]'::jsonb;

alter table public.home_page_settings
  add column if not exists announcement_rotation_ms integer not null default 5000;

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'home_page_settings_announcement_rotation_ms_check'
  ) then
    alter table public.home_page_settings
      add constraint home_page_settings_announcement_rotation_ms_check
      check (announcement_rotation_ms >= 3000 and announcement_rotation_ms <= 12000);
  end if;
end;
$migration$;

comment on column public.home_page_settings.announcement_messages is
  'JSON array of TipTap HTML strings; storefront rotates with crossfade. Empty uses catalog/env line.';
comment on column public.home_page_settings.announcement_rotation_ms is
  'Time each announcement message is shown before the next (3000–12000 ms).';

-- Backfill from legacy single HTML when the array is still empty
update public.home_page_settings
set announcement_messages = jsonb_build_array(to_jsonb(announcement_html::text))
where id = 1
  and jsonb_array_length(announcement_messages) = 0
  and coalesce(nullif(trim(announcement_html), ''), '') <> '';
