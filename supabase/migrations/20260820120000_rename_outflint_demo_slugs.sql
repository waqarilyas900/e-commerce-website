-- Rename legacy Outflint demo product slugs/SKUs to SimpleCartStore (scs-) prefix.
-- Safe to re-run: only rows still using the outflint- prefix are updated.

update public.products
set
  slug = replace(slug, 'outflint-', 'scs-'),
  updated_at = now()
where slug like 'outflint-%';

update public.product_variants
set
  sku = replace(sku, 'outflint-', 'scs-'),
  updated_at = now()
where sku like 'outflint-%';
