#!/usr/bin/env node
/**
 * Calls `/api/cron/price-drop-notifications` with CRON_SECRET from `.env`.
 * Usage: npm run cron:price-drop
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const site = process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/$/, "");
const defaultUrl = site && `${site}/api/cron/price-drop-notifications`;
const base = process.env.CRON_TEST_URL?.trim() || defaultUrl;
const secret = process.env.CRON_SECRET?.trim();

async function main() {
  if (!secret) {
    console.error("CRON_SECRET is missing from .env");
    process.exit(1);
  }
  if (!base) {
    console.error(
      "Set NEXT_PUBLIC_SITE_URL or CRON_TEST_URL (e.g. http://localhost:3000/api/cron/price-drop-notifications).",
    );
    process.exit(1);
  }
  console.log("GET", base);
  const res = await fetch(base, {
    headers: { Authorization: `Bearer ${secret}` },
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
  if (json.failures?.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
