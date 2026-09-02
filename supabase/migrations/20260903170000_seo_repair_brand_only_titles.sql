-- Repair seo_meta titles that only repeat the store brand (SimpleCartStore / Outflint).
-- Code also ignores these at runtime; this keeps admin + JSON-LD sources consistent.

create or replace function public.seo_normalize_brand_key(t text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(coalesce(btrim(t), ''), '[^a-zA-Z0-9]+', '', 'g'));
$$;

create or replace function public.seo_is_brand_only_title(t text)
returns boolean
language sql
immutable
as $$
  select
    coalesce(btrim(t), '') = ''
    or public.seo_normalize_brand_key(t) in (
      'simplecartstore',
      'simplecart',
      'outflint',
      'outflintstore'
    );
$$;

-- Products
update public.seo_meta sm
set
  title = left(btrim(p.name) || ' in Pakistan', 500),
  updated_at = now()
from public.products p
where sm.subject_type = 'product'
  and sm.subject_id = p.id
  and sm.locale = 'en'
  and public.seo_is_brand_only_title(sm.title);

-- Collections
update public.seo_meta sm
set
  title = left(btrim(c.name) || ' in Pakistan', 500),
  updated_at = now()
from public.collections c
where sm.subject_type = 'collection'
  and sm.subject_id = c.id
  and sm.locale = 'en'
  and public.seo_is_brand_only_title(sm.title);

-- Static routes (page part only — storefront suffixTitle adds | brand)
update public.seo_meta sm
set title = v.title, updated_at = now()
from (
  values
    ('/', 'Everyday Essentials Online in Pakistan'),
    ('/collections', 'Shop All Collections in Pakistan'),
    ('/contact', 'Contact Us'),
    ('/about', 'About Us'),
    ('/search', 'Search Products'),
    ('/sale', 'Sale & Deals'),
    ('/collections/sale', 'Sale Collection'),
    ('/policies', 'Store Policies'),
    ('/terms', 'Terms & Conditions'),
    ('/how-to-buy', 'How to Buy'),
    ('/purchase-protection', 'Purchase Protection'),
    ('/customer-reviews', 'Customer Reviews'),
    ('/blogs', 'Blog'),
    ('/track-order', 'Track Order'),
    ('/bundles', 'Product Bundles'),
    ('/login', 'Sign In'),
    ('/signup', 'Create Account'),
    ('/checkout', 'Checkout')
) as v(subject_key, title)
where sm.subject_type = 'route'
  and sm.subject_key = v.subject_key
  and sm.locale = 'en'
  and public.seo_is_brand_only_title(sm.title);

-- Policy pages linked at /{slug}
update public.seo_meta sm
set
  title = left(btrim(pp.title), 500),
  updated_at = now()
from public.policy_pages pp
where sm.subject_type = 'policy_page'
  and sm.subject_id = pp.id
  and sm.locale = 'en'
  and public.seo_is_brand_only_title(sm.title);

-- Home page sections (/s/{slug})
update public.seo_meta sm
set
  title = left(btrim(hps.name) || ' in Pakistan', 500),
  updated_at = now()
from public.home_page_sections hps
where sm.subject_type = 'home_section'
  and sm.subject_id = hps.id
  and sm.locale = 'en'
  and public.seo_is_brand_only_title(sm.title);

drop function if exists public.seo_is_brand_only_title(text);
drop function if exists public.seo_normalize_brand_key(text);
