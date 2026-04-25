#!/usr/bin/env node
/**
 * One-shot Supabase deploy for staging | uat | prod.
 * Delegates to `push-restock-edge.mjs`: db push → Edge secrets → deploy all Edge functions → Vault RPC.
 *
 * Usage:
 *   npm run supabase:deploy -- staging
 *   npm run supabase:deploy -- uat
 *   npm run supabase:deploy -- prod
 *   npm run supabase:deploy -- prod -- --rotate-cron
 *
 * Env files (first existing file wins):
 *   staging → .env.staging
 *   uat     → .env.uat
 *   prod    → .env.production, else .env.prod
 *
 * Loads base `.env` then the target file (overrides). Link CLI to the matching project before running.
 *
 * If a project's ref differs from `supabase/migrations/20260624120000_restock_edge_pg_cron.sql`
 * (hardcoded Edge URL), add a follow-up migration for that environment.
 */
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const TARGET_FILES = {
  staging: [".env.staging"],
  uat: [".env.uat"],
  prod: [".env.production", ".env.prod"],
};

function usage() {
  console.error(`Usage: npm run supabase:deploy -- <staging|uat|prod> [-- ...args passed to push-restock-edge]

Examples:
  npm run supabase:deploy -- staging
  npm run supabase:deploy -- prod -- --rotate-cron
`);
  process.exit(1);
}

const rawTarget = process.argv[2]?.toLowerCase().trim();
if (!rawTarget || !TARGET_FILES[rawTarget]) usage();

let envRel = null;
for (const f of TARGET_FILES[rawTarget]) {
  if (existsSync(resolve(root, f))) {
    envRel = f;
    break;
  }
}

if (!envRel) {
  console.error(
    `No env file found for "${rawTarget}". Create one of:\n  ${TARGET_FILES[rawTarget].join("\n  ")}`,
  );
  process.exit(1);
}

const dash = process.argv.indexOf("--", 3);
const extraArgs = dash === -1 ? [] : process.argv.slice(dash + 1);

console.log(`Supabase deploy target: ${rawTarget} (env file: ${envRel})\n`);

const r = spawnSync(
  process.execPath,
  [resolve(root, "scripts/push-restock-edge.mjs"), ...extraArgs],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, SUPABASE_DEPLOY_ENV_FILE: envRel },
  },
);

process.exit(r.status ?? 1);
