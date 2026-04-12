-- Allow active admins to read customer profiles for CRM / order context (admin panel).

create policy "users_select_admin"
  on public.users for select
  to authenticated
  using (public.is_active_admin());

comment on policy "users_select_admin" on public.users is
  'Admin panel: list customer profiles (RLS still blocks non-admins).';
