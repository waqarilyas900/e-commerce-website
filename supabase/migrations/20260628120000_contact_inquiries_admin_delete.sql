-- Allow active admins to remove contact inquiries from the admin panel.

drop policy if exists "contact_inquiries_delete_admin" on public.contact_inquiries;

create policy "contact_inquiries_delete_admin"
  on public.contact_inquiries
  for delete
  to authenticated
  using (public.is_active_admin());
