-- Total sellable units on the product row; variant rows sum to this when split from parent.
-- Remove legacy_id (replaced by slug-based lookups).

alter table public.products
  add column if not exists stock_total int;

update public.products p
set stock_total = coalesce(
  p.stock_total,
  (
    select coalesce(sum(i.quantity_on_hand), 0)::int
    from public.product_variants v
    left join public.inventory i on i.product_variant_id = v.id
    where v.product_id = p.id
  )
)
where stock_total is null;

drop index if exists public.products_legacy_id_idx;
alter table public.products drop constraint if exists products_legacy_id_key;
alter table public.products drop column if exists legacy_id;

comment on column public.products.stock_total is 'Total units for the product; admin splits evenly across variants when using matrix SKUs.';
