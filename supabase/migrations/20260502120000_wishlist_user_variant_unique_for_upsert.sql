-- PostgREST upsert: ON CONFLICT (user_id, product_variant_id) requires a non-partial unique
-- constraint or unique index. Partial indexes (WHERE product_variant_id IS NOT NULL) are not
-- valid conflict targets for that ON CONFLICT form.
--
-- PostgreSQL UNIQUE (user_id, product_variant_id) still allows multiple rows with
-- product_variant_id IS NULL (NULLs are distinct), so option-snapshot rows are unchanged.

drop index if exists public.wishlist_items_user_variant_uidx;

alter table public.wishlist_items
  drop constraint if exists wishlist_items_user_id_product_variant_uidx;

alter table public.wishlist_items
  add constraint wishlist_items_user_id_product_variant_uidx
  unique (user_id, product_variant_id);

comment on constraint wishlist_items_user_id_product_variant_uidx on public.wishlist_items is
  'Enforces one variant-level wishlist row per user; supports upsert onConflict(user_id, product_variant_id).';
