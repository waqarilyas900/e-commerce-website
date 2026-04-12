-- Public media bucket for the storefront (collection heroes, future product images).
-- Folder layout in app code: collections/hero/..., products/..., bundles/..., etc.

insert into storage.buckets (id, name, public)
values ('e-commerce-store', 'E-commerce store', true)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;

-- Anyone can read objects (public bucket URLs for the storefront).
create policy "ecommerce_store_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'e-commerce-store');

-- Signed-in users (admin panel) can manage uploads.
create policy "ecommerce_store_insert_authenticated"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'e-commerce-store');

create policy "ecommerce_store_update_authenticated"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'e-commerce-store')
  with check (bucket_id = 'e-commerce-store');

create policy "ecommerce_store_delete_authenticated"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'e-commerce-store');
