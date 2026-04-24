#!/usr/bin/env node
/**
 * Deploy restock Edge Function + DB schedule + secrets.
 *
 * 1. `supabase db push` — applies migrations (pg_cron daily → Edge Function; Vault name edge_cron_shared_secret).
 * 2. Edge secrets: CRON_SECRET, SERVICE_ROLE_KEY, RESEND_*, PUBLIC_SITE_URL.
 * 3. `supabase functions deploy restock-notifications`.
 * 4. RPC `sync_edge_cron_vault_secret` — copies CRON_SECRET into Vault so pg_cron can send the same Bearer
 *    (one shared secret for all HTTP crons that use this Vault entry).
 *
 * CRON_SECRET: uses `.env` value; only generates if missing. `--rotate-cron` replaces it (update Supabase schedule is N/A — Vault + Edge secrets update on next deploy).
 *
 * Requires: `supabase login`, linked project (or standard link), `.env` with
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET (optional generate).
 *
 * Multi-env: `SUPABASE_DEPLOY_ENV_FILE=.env.staging` loads `.env` then overrides from that file
 * (set by `npm run supabase:deploy -- staging|uat|prod`).
 *
 * Usage: npm run cron:restock:deploy
 */
import { config } from "dotenv";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
} from "fs";
import { tmpdir } from "os";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const deployEnvFile = process.env.SUPABASE_DEPLOY_ENV_FILE?.trim();
if (deployEnvFile) {
  if (existsSync(resolve(root, ".env"))) {
    config({ path: resolve(root, ".env") });
  }
  config({ path: resolve(root, deployEnvFile), override: true });
} else {
  config({ path: resolve(root, ".env"), override: true });
}

/** File where CRON_SECRET is read/written when rotating or generating. */
const envWritePath = deployEnvFile
  ? resolve(root, deployEnvFile)
  : resolve(root, ".env");

function projectRefFromEnv() {
  const explicit = process.env.SUPABASE_PROJECT_REF?.trim();
  if (explicit) return explicit;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const m = url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i);
  return m?.[1] ?? null;
}

function envLine(key, value) {
  if (value === undefined || value === null) return `${key}=`;
  const s = String(value);
  if (/[\s#"']/.test(s) || s === "") {
    return `${key}="${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return `${key}=${s}`;
}

async function main() {
  const projectRef = projectRefFromEnv();
  if (!projectRef) {
    console.error(
      "Missing project ref: set SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL (https://<ref>.supabase.co).",
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !srk) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env",
    );
    process.exit(1);
  }

  const rotate = process.argv.includes("--rotate-cron");
  let cronSecret = process.env.CRON_SECRET?.trim();
  if (!existsSync(envWritePath)) {
    console.error(`Missing env file: ${envWritePath}`);
    process.exit(1);
  }
  let envText = readFileSync(envWritePath, "utf8");
  if (rotate || !cronSecret) {
    cronSecret = crypto.randomBytes(24).toString("hex");
    if (/^CRON_SECRET=/m.test(envText)) {
      envText = envText.replace(/^CRON_SECRET=.*$/m, `CRON_SECRET=${cronSecret}`);
    } else {
      envText = envText.trimEnd() + `\nCRON_SECRET=${cronSecret}\n`;
    }
    writeFileSync(envWritePath, envText);
    console.log(
      rotate
        ? `Rotated CRON_SECRET in ${deployEnvFile ?? ".env"} (not printed).`
        : `Added CRON_SECRET to ${deployEnvFile ?? ".env"} (not printed).`,
    );
  } else {
    console.log(
      `Using existing CRON_SECRET from ${deployEnvFile ?? ".env"} (shared across Edge + pg_cron).`,
    );
  }

  const resendFrom =
    process.env.RESEND_FROM?.replace(/^["']|["']$/g, "").trim() ||
    "Store <onboarding@resend.dev>";
  const publicSite =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

  console.log("Applying database migrations (includes pg_cron schedule)…");
  execFileSync("supabase", ["db", "push", "--yes"], {
    cwd: root,
    stdio: "inherit",
  });

  const dir = mkdtempSync(join(tmpdir(), "restock-edge-"));
  const secretFile = join(dir, "secrets.env");
  const lines = [
    envLine("CRON_SECRET", cronSecret),
    envLine("SERVICE_ROLE_KEY", srk),
    envLine("RESEND_API_KEY", process.env.RESEND_API_KEY?.trim() ?? ""),
    envLine("RESEND_FROM", resendFrom),
    envLine("PUBLIC_SITE_URL", publicSite),
    "",
  ].join("\n");
  writeFileSync(secretFile, lines, "utf8");

  try {
    console.log("Setting Edge Function secrets on Supabase…");
    execFileSync(
      "supabase",
      ["secrets", "set", "--env-file", secretFile, "--project-ref", projectRef],
      { cwd: root, stdio: "inherit" },
    );

    console.log("Deploying restock-notifications…");
    execFileSync(
      "supabase",
      [
        "functions",
        "deploy",
        "restock-notifications",
        "--project-ref",
        projectRef,
        "--yes",
      ],
      { cwd: root, stdio: "inherit" },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  const admin = createClient(supabaseUrl, srk, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: vErr } = await admin.rpc("sync_edge_cron_vault_secret", {
    p_secret: cronSecret,
  });
  if (vErr) {
    console.error("Vault sync failed:", vErr.message);
    process.exit(1);
  }
  console.log(
    "Synced Vault secret edge_cron_shared_secret (pg_cron uses same Bearer as Edge CRON_SECRET).",
  );

  const fnUrl = `https://${projectRef}.supabase.co/functions/v1/restock-notifications`;
  console.log("\nDone.");
  console.log("Function URL:", fnUrl);
  console.log(
    "Schedule: pg_cron job `restock_notifications_edge_daily` at 0 0 * * * (UTC).",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
