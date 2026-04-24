-- Daily pg_cron → pg_net HTTP POST to Edge Function `restock-notifications`.
-- Authorization Bearer is read from Vault (name: edge_cron_shared_secret), kept in sync with
-- Edge secret CRON_SECRET via public.sync_edge_cron_vault_secret (service_role only), e.g. npm run cron:restock:deploy.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.sync_edge_cron_vault_secret(p_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $fn$
DECLARE
  sid uuid;
BEGIN
  IF p_secret IS NULL OR length(trim(p_secret)) = 0 THEN
    RAISE EXCEPTION 'sync_edge_cron_vault_secret: p_secret must be non-empty';
  END IF;

  SELECT ds.id INTO sid
  FROM vault.decrypted_secrets AS ds
  WHERE ds.name = 'edge_cron_shared_secret'
  LIMIT 1;

  IF sid IS NOT NULL THEN
    PERFORM vault.update_secret(
      sid,
      trim(p_secret),
      'edge_cron_shared_secret',
      'Shared Bearer for Edge Function HTTP crons (same value as CRON_SECRET)'
    );
  ELSE
    PERFORM vault.create_secret(
      trim(p_secret),
      'edge_cron_shared_secret',
      'Shared Bearer for Edge Function HTTP crons (same value as CRON_SECRET)'
    );
  END IF;
END;
$fn$;

REVOKE ALL ON FUNCTION public.sync_edge_cron_vault_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_edge_cron_vault_secret(text) TO service_role;

CREATE OR REPLACE FUNCTION public.invoke_restock_notifications_edge()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $fn$
DECLARE
  fn_url constant text :=
    'https://pbuuafxmkebfytoabtqk.supabase.co/functions/v1/restock-notifications';
  bearer text;
BEGIN
  SELECT ds.decrypted_secret INTO bearer
  FROM vault.decrypted_secrets AS ds
  WHERE ds.name = 'edge_cron_shared_secret'
  LIMIT 1;

  IF bearer IS NULL OR length(trim(bearer)) = 0 THEN
    RAISE WARNING 'invoke_restock_notifications_edge: missing vault secret edge_cron_shared_secret; run npm run cron:restock:deploy';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(bearer)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.invoke_restock_notifications_edge() FROM PUBLIC;

DO $outer$
DECLARE
  jid integer;
BEGIN
  SELECT j.jobid INTO jid
  FROM cron.job AS j
  WHERE j.jobname = 'restock_notifications_edge_daily'
  LIMIT 1;

  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END;
$outer$;

SELECT cron.schedule(
  'restock_notifications_edge_daily',
  '0 0 * * *',
  $job$SELECT public.invoke_restock_notifications_edge();$job$
);
