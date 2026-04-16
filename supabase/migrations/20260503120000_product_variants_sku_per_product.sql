-- SKU uniqueness per product (not globally). Different products may use the same SKU
-- string without collision; within one product each SKU must remain unique.

alter table public.product_variants
  drop constraint if exists product_variants_sku_key;

create unique index if not exists product_variants_product_id_sku_uidx
  on public.product_variants (product_id, sku);

comment on index public.product_variants_product_id_sku_uidx is
  'One row per (product, sku); replaces global unique on sku alone.';
