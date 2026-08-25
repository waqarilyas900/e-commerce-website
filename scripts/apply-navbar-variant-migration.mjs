import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

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

const ref = process.env.SUPABASE_PROJECT_REF || "onmnnxcdwcuegsbvjoqa";
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Missing SUPABASE_DB_PASSWORD");
  process.exit(1);
}

const sql = fs.readFileSync(
  path.join(__dirname, "../supabase/migrations/20260825120000_navbar_variant.sql"),
  "utf8",
);

// Project lives in ap-south-1 (Mumbai); ap-southeast-1 pooler returns ENOTFOUND tenant.
const region = process.env.SUPABASE_DB_REGION || "ap-south-1";
const connectionString = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(sql);
  await client.query(
    `update public.home_page_settings set navbar_variant = 'v2', updated_at = now() where id = 1`,
  );
  console.log("Migration applied; navbar_variant set to v2");
} finally {
  await client.end();
}
