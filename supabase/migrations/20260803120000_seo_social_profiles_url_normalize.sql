-- Make `seo_social_profiles` forgiving of human input.
--
-- Two changes:
--   1. Add a BEFORE INSERT/UPDATE trigger that auto-normalizes the URL —
--      trims whitespace, prepends https:// when the scheme is missing for any
--      non-`facebook_app` row, and passes numeric Facebook App IDs through
--      untouched. This means a paste like "facebook.com/outflint" no longer
--      trips the format check.
--   2. Loosen the `seo_social_url_format` check to also allow empty strings,
--      so the admin "Add profile" button (which can momentarily insert a
--      blank row before the operator fills it in) never fails on the empty
--      placeholder. Storefront `sameAs[]` already filters out empties via
--      `^https?://` (see lib/seo/site-identity.ts), so opening this gate
--      can never pollute Organization JSON-LD.
--
-- Original constraint (dropped here):
--   (platform = 'facebook_app') or (url ~* '^https?://')

create or replace function public.seo_social_profiles_normalize_url()
returns trigger
language plpgsql
as $$
declare
  v text;
begin
  v := btrim(coalesce(new.url, ''));

  if new.platform = 'facebook_app' then
    -- App ID column: keep digits/whatever the admin typed, just trimmed.
    new.url := v;
  else
    -- Real URL column: auto-prepend https:// when the scheme is missing but
    -- the value looks like a hostname (e.g. 'facebook.com/x', 'www.x.com').
    if v <> '' and v !~* '^https?://' then
      if v ~* '^(www\.|([a-z0-9-]+\.)+[a-z]{2,})' then
        v := 'https://' || regexp_replace(v, '^/+', '');
      end if;
    end if;
    new.url := v;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_seo_social_profiles_normalize_url
  on public.seo_social_profiles;
create trigger trg_seo_social_profiles_normalize_url
  before insert or update on public.seo_social_profiles
  for each row execute function public.seo_social_profiles_normalize_url();

-- Replace the strict check with one that also accepts empty strings.
alter table public.seo_social_profiles
  drop constraint if exists seo_social_url_format;

alter table public.seo_social_profiles
  add constraint seo_social_url_format check (
    (platform = 'facebook_app')
    or (url = '')
    or (url ~* '^https?://')
  );

comment on function public.seo_social_profiles_normalize_url() is
  'Trims and auto-prefixes https:// on social profile URLs so the admin UI
   can never trip the seo_social_url_format check on otherwise-valid hostnames.';
