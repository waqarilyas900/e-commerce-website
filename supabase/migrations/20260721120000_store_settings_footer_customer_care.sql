-- Footer "Customer care" block: admin-editable section title + policy link labels/order.
-- "Contact us" (/contact) remains hardcoded on the storefront.

alter table public.store_settings
  add column if not exists footer_customer_care_title text not null default 'Customer care';

alter table public.store_settings
  add column if not exists footer_policy_links jsonb not null default '[
    {"slug": "about", "label": "About us"},
    {"slug": "returns", "label": "Returns & Exchanges"},
    {"slug": "shipping", "label": "Shipping Policy"},
    {"slug": "terms", "label": "Terms of Service"},
    {"slug": "privacy", "label": "Privacy Policy"}
  ]'::jsonb;

comment on column public.store_settings.footer_customer_care_title is
  'Heading shown above the customer-care links in the storefront footer.';

comment on column public.store_settings.footer_policy_links is
  'Ordered JSON array of { "slug": string, "label": string } for /policies/[slug]. Contact us is always appended by the storefront.';
