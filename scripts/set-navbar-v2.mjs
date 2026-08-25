import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  const k = m[1].trim();
  let v = m[2].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (!process.env[k]) process.env[k] = v;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing supabase env");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// Ensure column exists via raw SQL if possible (PostgREST can't ALTER).
// Fallback: try update; if column missing, print migration hint.
const { error: updErr } = await sb
  .from("home_page_settings")
  .update({ navbar_variant: "v2", updated_at: new Date().toISOString() })
  .eq("id", 1);

if (updErr) {
  console.error("Could not set navbar_variant:", updErr.message);
  console.error(
    "Run migration: supabase/migrations/20260825120000_navbar_variant.sql",
  );
  process.exit(1);
}
console.log("home_page_settings.navbar_variant = v2");
