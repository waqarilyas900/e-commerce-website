#!/usr/bin/env node
/**
 * Calls the Supabase Edge Function `restock-notifications` with CRON_SECRET from `.env`.
 * Usage (from e-commerece-website): npm run cron:restock
 *
 * URL: CRON_TEST_URL if set, else NEXT_PUBLIC_SUPABASE_URL + `/functions/v1/restock-notifications`
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const defaultFn =
  supabaseUrl &&
  `${supabaseUrl.replace(/\/$/, "")}/functions/v1/restock-notifications`;
const base = process.env.CRON_TEST_URL?.trim() || defaultFn;
const secret = process.env.CRON_SECRET?.trim();

async function main() {
  if (!secret) {
    console.error("CRON_SECRET is missing from .env — add it to run the cron locally.");
    process.exit(1);
  }
  if (!base) {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL (default function URL) or CRON_TEST_URL to the full Edge Function URL.",
    );
    process.exit(1);
  }
  console.log("GET", base);
  const res = await fetch(base, {
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
