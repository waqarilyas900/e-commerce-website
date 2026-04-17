-- Ensure logged-in users can upload to the public e-commerce bucket when JWT is attached.
-- Some clients resolve the session in a way where `to authenticated` alone did not match;
-- `auth.uid() is not null` matches any valid user JWT (anon key + user session).

drop policy if exists "ecommerce_store_insert_user_uid" on storage.objects;

create policy "ecommerce_store_insert_user_uid"
  on storage.objects
  for insert
  to public
  with check (
    bucket_id = 'e-commerce-store'
    and auth.uid() is not null
  );

-- Note: `comment on policy ... on storage.objects` requires owning `storage.objects` and fails
-- under `supabase db push` (migration role). Policy purpose: signed-in JWT (auth.uid()) can insert.
