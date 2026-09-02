-- Post-delivery review request emails (4+ days after order; sent by storefront cron + Resend).

alter table public.orders
  add column if not exists review_request_sent_at timestamptz;

comment on column public.orders.review_request_sent_at is
  'When the post-delivery review request email was sent (once per order).';

create index if not exists orders_review_request_pending_idx
  on public.orders (created_at)
  where review_request_sent_at is null
    and email is not null
    and length(trim(email)) > 0;

-- Daily pg_cron → pg_net HTTP POST to storefront `/api/cron/review-request-emails`.
create or replace function public.invoke_review_request_emails_cron()
returns void
language plpgsql
security definer
set search_path = public, vault, net
as $fn$
declare
  fn_url constant text :=
    'https://www.simplecartstore.com/api/cron/review-request-emails';
  bearer text;
begin
  select ds.decrypted_secret into bearer
  from vault.decrypted_secrets as ds
  where ds.name = 'edge_cron_shared_secret'
  limit 1;

  if bearer is null or length(trim(bearer)) = 0 then
    raise warning 'invoke_review_request_emails_cron: missing vault secret edge_cron_shared_secret; run npm run cron:restock:deploy';
    return;
  end if;

  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(bearer)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
end;
$fn$;

revoke all on function public.invoke_review_request_emails_cron() from public;

do $outer$
declare
  jid integer;
begin
  select j.jobid into jid
  from cron.job as j
  where j.jobname = 'review_request_emails_daily'
  limit 1;

  if jid is not null then
    perform cron.unschedule(jid);
  end if;
end;
$outer$;

select cron.schedule(
  'review_request_emails_daily',
  '30 1 * * *',
  $job$select public.invoke_review_request_emails_cron();$job$
);

comment on function public.invoke_review_request_emails_cron() is
  'POSTs to storefront review-request cron (Bearer = vault edge_cron_shared_secret / CRON_SECRET).';
