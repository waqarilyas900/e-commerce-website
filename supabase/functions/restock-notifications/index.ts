/**
 * Supabase Edge Function: restock-notifications
 *
 * Same behavior as the former Next.js route `/api/cron/restock-notifications`.
 *
 * Schedule: pg_cron job `restock_notifications_edge_daily` (UTC `0 0 * * *`) POSTs here with
 * Bearer from Vault `edge_cron_shared_secret`, synced from CRON_SECRET via `npm run cron:restock:deploy`.
 * Manual calls: `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret`.
 *
 * Secrets (Edge dashboard or `npm run cron:restock:deploy`):
 * - CRON_SECRET
 * - SERVICE_ROLE_KEY (Supabase CLI rejects secret names starting with SUPABASE_)
 * - RESEND_API_KEY, RESEND_FROM (optional), RESEND_DEFAULT_FROM (fallback when RESEND_FROM unset)
 * - PUBLIC_SITE_URL | NEXT_PUBLIC_SITE_URL | EDGE_PUBLIC_SITE_URL (storefront base URL for product links)
 * - EDGE_DEV_SITE_ORIGIN (optional last-resort fallback when none of the above are set, e.g. local edge tests)
 *
 * Auto-provided: SUPABASE_URL
 */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- ambient Deno types (not a runtime module)
/// <reference path="../edge-ambient.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

type QueueRow = {
  id: string;
  user_email: string;
  wishlist_item_id: string;
  product_variant_id: string;
};

const BATCH = 25;
const RESEND_ONBOARDING_FALLBACK = "Store <onboarding@resend.dev>";

function resendFromLine(): string {
  return (
    Deno.env.get("RESEND_FROM")?.trim() ||
    Deno.env.get("RESEND_DEFAULT_FROM")?.trim() ||
    RESEND_ONBOARDING_FALLBACK
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sendRestockEmail(input: {
  to: string;
  productName: string;
  variantLabel: string;
  productUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  const from = resendFromLine();
  if (!apiKey) {
    return {
      sent: false,
      error: "Email not configured (RESEND_API_KEY / RESEND_FROM)",
    };
  }

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#171717;max-width:560px">
  <h1 style="font-size:20px">Back in stock</h1>
  <p>Good news — <strong>${escapeHtml(input.productName)}</strong> (${escapeHtml(input.variantLabel)}) is available again.</p>
  <p style="margin-top:20px">
    <a href="${escapeHtml(input.productUrl)}" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;padding:10px 18px;border-radius:9999px;font-size:14px;font-weight:600">View product</a>
  </p>
  <p style="margin-top:24px;font-size:12px;color:#737373">You received this because you asked to be notified when this option was restocked.</p>
</body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: `Back in stock — ${input.productName}`,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text) as { message?: string };
      if (j?.message) msg = j.message;
    } catch {
      // keep raw text
    }
    return { sent: false, error: msg || `Resend HTTP ${res.status}` };
  }
  return { sent: true };
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const secret = Deno.env.get("CRON_SECRET")?.trim();
  if (!secret) {
    return jsonResponse({ error: "CRON_SECRET not configured" }, 503);
  }

  const auth = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");
  const token = auth?.startsWith("Bearer ")
    ? auth.slice(7).trim()
    : headerSecret?.trim();
  if (token !== secret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey =
    Deno.env.get("SERVICE_ROLE_KEY")?.trim() ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(
      {
        ok: false,
        error: "Missing SUPABASE_URL or SERVICE_ROLE_KEY",
      },
      503,
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rawSite =
    Deno.env.get("PUBLIC_SITE_URL")?.trim() ||
    Deno.env.get("NEXT_PUBLIC_SITE_URL")?.trim() ||
    Deno.env.get("EDGE_PUBLIC_SITE_URL")?.trim();
  const site = rawSite
    ? rawSite.replace(/\/$/, "")
    : Deno.env.get("EDGE_DEV_SITE_ORIGIN")?.trim()?.replace(/\/$/, "") ||
      "http://localhost:3000";

  const { data: rows, error: qErr } = await admin
    .from("restock_notification_queue")
    .select("id, user_email, wishlist_item_id, product_variant_id")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (qErr || !rows?.length) {
    return jsonResponse({
      ok: true,
      processed: 0,
      error: qErr?.message,
    });
  }

  let sent = 0;
  let failed = 0;
  const failures: Array<{ queueId: string; email: string; error?: string }> =
    [];

  for (const row of rows as QueueRow[]) {
    const { data: vrow } = await admin
      .from("product_variants")
      .select("option_values, products(name, slug)")
      .eq("id", row.product_variant_id)
      .maybeSingle();

    const prod = vrow?.products as unknown;
    const productName =
      prod &&
      typeof prod === "object" &&
      !Array.isArray(prod) &&
      "name" in prod
        ? String((prod as { name: string }).name)
        : "Product";

    const slug =
      prod &&
      typeof prod === "object" &&
      !Array.isArray(prod) &&
      "slug" in prod
        ? String((prod as { slug: string }).slug)
        : "";

    const ov =
      vrow &&
      typeof vrow.option_values === "object" &&
      vrow.option_values !== null
        ? (vrow.option_values as Record<string, string>)
        : {};
    const variantLabel =
      Object.keys(ov).length > 0
        ? Object.entries(ov)
            .map(([k, val]) => `${k}: ${val}`)
            .join(" · ")
        : "Selected option";

    const productUrl = slug
      ? `${site}/products/${encodeURIComponent(slug)}`
      : site;

    const result = await sendRestockEmail({
      to: row.user_email,
      productName,
      variantLabel,
      productUrl,
    });

    const now = new Date().toISOString();

    if (result.sent) {
      await admin
        .from("restock_notification_queue")
        .update({ processed_at: now })
        .eq("id", row.id);

      await admin.from("wishlist_items").delete().eq("id", row.wishlist_item_id);

      sent += 1;
    } else {
      failed += 1;
      failures.push({
        queueId: row.id,
        email: row.user_email,
        error: result.error ?? "send failed",
      });
    }
  }

  return jsonResponse({
    ok: true,
    processed: rows.length,
    sent,
    failed,
    ...(failures.length > 0 ? { failures } : {}),
  });
});
