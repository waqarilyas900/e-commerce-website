/**
 * Runs: supabase link --project-ref pbuuafxmkebfytoabtqk
 * Optional: set SUPABASE_DB_PASSWORD in .env to pass -p non-interactively.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env") });

const PROJECT_REF = "pbuuafxmkebfytoabtqk";
const pw = process.env.SUPABASE_DB_PASSWORD;

const args = ["supabase", "link", "--project-ref", PROJECT_REF];
if (pw) {
  args.push("-p", pw, "--yes");
}

const r = spawnSync("npx", args, {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(r.status ?? 1);
