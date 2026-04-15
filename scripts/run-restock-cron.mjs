#!/usr/bin/env node
/**
 * Calls GET /api/cron/restock-notifications with CRON_SECRET from .env
 * Usage (from e-commerece-website): node scripts/run-restock-cron.mjs
 * Optional: CRON_TEST_URL=https://your-domain.com/api/cron/restock-notifications
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const base =
  process.env.CRON_TEST_URL?.trim() || "http://localhost:3000/api/cron/restock-notifications";
const secret = process.env.CRON_SECRET?.trim();

async function main() {
  if (!secret) {
    console.error("CRON_SECRET is missing from .env — add it to run the cron locally.");
    process.exit(1);
  }
  const url = base.includes("/api/cron/") ? base : `${base.replace(/\/$/, "")}/api/cron/restock-notifications`;
  console.log("GET", url);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.log(text);
    process.exit(res.ok ? 0 : 1);
  }
  console.log(JSON.stringify(json, null, 2));
  if (!res.ok) process.exit(1);
  if (json.failures?.length) {
    console.error(
      "\nSome sends failed — Resend test mode only mails your account email until you verify a domain (resend.com/domains).",
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
