#!/usr/bin/env node
/**
 * Full Supabase deploy from `.env` (or `SUPABASE_DEPLOY_ENV_FILE` override):
 *
 * 1. `supabase db push --yes` — all migrations (incl. pg_cron → Edge; Vault `edge_cron_shared_secret`).
 * 2. Edge secrets — CRON_SECRET, SERVICE_ROLE_KEY, RESEND_*, site URL chain, optional Edge fallbacks.
 * 3. `supabase functions deploy <each>` — every folder under `supabase/functions/` with `index.ts` (or `index.js`).
 * 4. RPC `sync_edge_cron_vault_secret` — pg_cron Bearer matches Edge `CRON_SECRET`.
 *
 * Runs **`npx supabase`** (with `shell` on Windows). Direct `execFile` of `supabase.cmd` fails with EINVAL on Windows.
 *
 * CRON_SECRET: from `.env`; generates if missing. `--rotate-cron` writes a new secret to the env file.
 *
 * Requires: `supabase login`, linked project, `.env` with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Multi-env: `npm run supabase:deploy -- staging|uat|prod` sets `SUPABASE_DEPLOY_ENV_FILE`.
 *
 * Usage: `npm run supabase:all` or `npm run cron:restock:deploy`
 */
import { config } from "dotenv";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
  readdirSync,
  statSync,
} from "fs";
import { tmpdir } from "os";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
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

/** Raw `.env` value without wrapping quotes. */
function trimEnv(key) {
  const v = process.env[key];
  if (v === undefined || v === null) return "";
  return String(v)
    .trim()
    .replace(/^["']|["']$/g, "");
}

/**
 * Run Supabase CLI via `npx` from this project. On Windows, `execFile` on `.cmd` shims returns EINVAL;
 * `spawnSync` + `shell: true` matches `scripts/supabase-link.mjs`.
 */
function runSupabase(cliArgs) {
  const win = process.platform === "win32";
  const r = spawnSync("npx", ["supabase", ...cliArgs], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: win,
  });
  if (r.error) {
    throw r.error;
  }
  if (r.status !== 0 && r.status !== null) {
    process.exit(r.status ?? 1);
  }
}

/** Subdirs of `supabase/functions` that look like Edge functions. */
function listEdgeFunctionNames() {
  const dir = join(root, "supabase", "functions");
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || name === "node_modules") continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    if (
      existsSync(join(p, "index.ts")) ||
      existsSync(join(p, "index.js")) ||
      existsSync(join(p, "index.tsx"))
    ) {
      out.push(name);
    }
  }
  return out.sort();
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
    trimEnv("RESEND_FROM") || "Store <onboarding@resend.dev>";
  const publicSite =
    trimEnv("PUBLIC_SITE_URL") ||
    trimEnv("NEXT_PUBLIC_SITE_URL") ||
    "http://localhost:3000";
  const nextPublicSite = trimEnv("NEXT_PUBLIC_SITE_URL") || publicSite;
  const edgePublicSite = trimEnv("EDGE_PUBLIC_SITE_URL");
  const edgeDevOrigin =
    trimEnv("EDGE_DEV_SITE_ORIGIN") || "http://localhost:3000";
  const resendDefaultFrom =
    trimEnv("RESEND_DEFAULT_FROM") || "Store <onboarding@resend.dev>";
  const metaPixelId =
    trimEnv("META_PIXEL_ID") || trimEnv("FB_PIXEL_ID") || "2830556603968775";
  const metaAccessToken =
    trimEnv("META_ACCESS_TOKEN") || trimEnv("FB_ACCESS_TOKEN");
  const metaGraphVersion =
    trimEnv("META_GRAPH_API_VERSION") || trimEnv("FB_GRAPH_API_VERSION");

  console.log("Applying database migrations (includes pg_cron schedule)…");
  runSupabase(["db", "push", "--yes"]);

  const dir = mkdtempSync(join(tmpdir(), "restock-edge-"));
  const secretFile = join(dir, "secrets.env");
  const lines = [
    envLine("CRON_SECRET", cronSecret),
    envLine("SERVICE_ROLE_KEY", srk),
    envLine("RESEND_API_KEY", trimEnv("RESEND_API_KEY")),
    envLine("RESEND_FROM", resendFrom),
    envLine("RESEND_DEFAULT_FROM", resendDefaultFrom),
    envLine("PUBLIC_SITE_URL", publicSite),
    envLine("NEXT_PUBLIC_SITE_URL", nextPublicSite),
    envLine("EDGE_PUBLIC_SITE_URL", edgePublicSite),
    envLine("EDGE_DEV_SITE_ORIGIN", edgeDevOrigin),
    envLine("META_PIXEL_ID", metaPixelId),
    envLine("META_ACCESS_TOKEN", metaAccessToken),
    envLine("META_GRAPH_API_VERSION", metaGraphVersion),
    "",
  ].join("\n");
  writeFileSync(secretFile, lines, "utf8");

  try {
    console.log("Setting Edge Function secrets on Supabase…");
    runSupabase([
      "secrets",
      "set",
      "--env-file",
      secretFile,
      "--project-ref",
      projectRef,
    ]);

    const fnNames = listEdgeFunctionNames();
    if (!fnNames.length) {
      console.warn("No Edge functions found under supabase/functions/ — skip deploy.");
    }
    for (const name of fnNames) {
      console.log(`Deploying Edge function: ${name}…`);
      runSupabase([
        "functions",
        "deploy",
        name,
        "--project-ref",
        projectRef,
        "--yes",
      ]);
    }
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
