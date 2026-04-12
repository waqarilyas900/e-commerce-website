/**
 * Creates the seed admin in Supabase Auth and upserts public.admins.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (never expose in client code).
 * Loads NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) from .env.
 *
 * Usage (from nextjs-project):
 *   npm run seed:admin
 *
 * Override defaults:
 *   ADMIN_SEED_EMAIL=other@store.com ADMIN_SEED_PASSWORD='secret' npm run seed:admin
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

config({ path: resolve(root, ".env") });

const EMAIL = process.env.ADMIN_SEED_EMAIL ?? "admin@store.com";
const PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? "admin@123";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function findUserIdByEmail(adminAuth, email) {
  const target = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await adminAuth.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === target,
    );
    if (found) return found.id;
    if (!data.users.length || data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  if (!url) {
    fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.");
  }
  if (!serviceKey) {
    fail(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env (Dashboard → Settings → API → service_role).",
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let userId = await findUserIdByEmail(supabase.auth.admin, EMAIL);

  if (userId) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    console.log("Auth user already existed; password updated:", EMAIL);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { role: "admin" },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log("Created auth user:", EMAIL);
  }

  const { error: upsertError } = await supabase.from("admins").upsert(
    {
      auth_id: userId,
      email: EMAIL.trim().toLowerCase(),
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "auth_id" },
  );

  if (upsertError) throw upsertError;

  console.log("Upserted public.admins (status=active) for:", EMAIL);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
