-- Idempotent repair: ensure logged-in users can INSERT into the public e-commerce bucket.
-- Supabase Storage RLS: `to authenticated` alone can miss some JWT + anon-key clients; this policy
-- uses `to public` with `auth.uid() is not null` so any session with a user id can upload.
-- Safe if 20260528120000 already applied: same policy name is dropped and recreated.

drop policy if exists "ecommerce_store_insert_user_uid" on storage.objects;

create policy "ecommerce_store_insert_user_uid"
  on storage.objects
  for insert
  to public
  with check (
    bucket_id = 'e-commerce-store'
    and auth.uid() is not null
  );
