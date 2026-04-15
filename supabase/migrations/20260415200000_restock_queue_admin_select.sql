-- Allow active admins to read the restock email queue (Vite admin panel, Supabase client + JWT).

create policy "restock_notification_queue_select_admin"
  on public.restock_notification_queue for select
  to authenticated
  using (public.is_active_admin());

comment on policy "restock_notification_queue_select_admin" on public.restock_notification_queue is
  'Cron and triggers use service role; authenticated admins can monitor pending/processed jobs.';
