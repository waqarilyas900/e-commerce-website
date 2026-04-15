-- Per-product storefront controls for variant pickers: labels, presentation, order.
-- JSON array: [{ "key": "size", "label": "Screen size", "presentation": "pills", "sort_order": 0 }, ...]

alter table public.products
  add column if not exists variant_option_schema jsonb not null default '[]'::jsonb;

comment on column public.products.variant_option_schema is
  'Storefront PDP: variant dimension UI. Keys must match product_variants.option_values keys.';
