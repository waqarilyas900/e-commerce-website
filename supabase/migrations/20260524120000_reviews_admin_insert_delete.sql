-- Admins can insert reviews on behalf of any customer (attributed to users.id) and delete any review.

drop policy if exists "reviews_insert_admin" on public.reviews;
create policy "reviews_insert_admin"
  on public.reviews for insert
  to authenticated
  with check (public.is_active_admin());

drop policy if exists "reviews_delete_admin" on public.reviews;
create policy "reviews_delete_admin"
  on public.reviews for delete
  to authenticated
  using (public.is_active_admin());

comment on policy "reviews_insert_admin" on public.reviews is
  'Staff can create a review row for any product + user (e.g. moderation or seeding).';

comment on policy "reviews_delete_admin" on public.reviews is
  'Staff can remove a review row; product rating/count refresh via existing trigger.';
