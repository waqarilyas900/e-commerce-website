import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SavedAddress } from "@/app/lib/saved-addresses";

type SaveAddressPayload = {
  address_id?: string;
  label?: string;
  first_name: string;
  last_name: string;
  phone: string;
  shipping_street: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_province: string;
  shipping_country?: string;
  set_default?: boolean;
};

type AddressMutationPayload = {
  address_id?: string;
  set_default?: boolean;
  label?: string;
};

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

async function getAppUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  authUserId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUserId)
    .maybeSingle();
  return data?.id ?? null;
}

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

function readUserMetaName(meta: unknown, key: string): string {
  if (!meta || typeof meta !== "object") return "";
  const value = (meta as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

async function getOrCreateAppUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  authUser: { id: string; user_metadata?: unknown },
): Promise<string | null> {
  const existing = await getAppUserId(supabase, authUser.id);
  if (existing) return existing;

  const first = readUserMetaName(authUser.user_metadata, "first_name");
  const last = readUserMetaName(authUser.user_metadata, "last_name");
  const phone = readUserMetaName(authUser.user_metadata, "phone");

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        auth_id: authUser.id,
        first_name: first,
        last_name: last,
        phone,
      },
      { onConflict: "auth_id" },
    )
    .select("id")
    .maybeSingle();

  if (error) return null;
  return data?.id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getOrCreateAppUserId(supabase, user);
  if (!userId) {
    return NextResponse.json({ ok: true, addresses: [] satisfies SavedAddress[] });
  }

  const { data, error } = await supabase
    .from("user_saved_addresses")
    .select(
      "id,label,first_name,last_name,phone,shipping_street,shipping_city,shipping_postal_code,shipping_province,shipping_country,is_default,updated_at",
    )
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ ok: true, addresses: [] satisfies SavedAddress[] });
    }
    /** RLS/schema/env issues should not break checkout; log and return an empty list. */
    console.warn("[checkout/saved-addresses] GET failed:", error);
    return NextResponse.json({ ok: true, addresses: [] satisfies SavedAddress[] });
  }

  return NextResponse.json({ ok: true, addresses: (data ?? []) as SavedAddress[] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getOrCreateAppUserId(supabase, user);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = body as SaveAddressPayload;
  const payload = {
    label: clean(incoming.label),
    first_name: clean(incoming.first_name),
    last_name: clean(incoming.last_name),
    phone: clean(incoming.phone),
    shipping_street: clean(incoming.shipping_street),
    shipping_city: clean(incoming.shipping_city),
    shipping_postal_code: clean(incoming.shipping_postal_code),
    shipping_province: clean(incoming.shipping_province),
    shipping_country: clean(incoming.shipping_country) || "PK",
  };

  const missing: string[] = [];
  if (!payload.first_name) missing.push("first_name");
  if (!payload.last_name) missing.push("last_name");
  if (!payload.phone) missing.push("phone");
  if (!payload.shipping_street) missing.push("shipping_street");
  if (!payload.shipping_city) missing.push("shipping_city");
  if (!payload.shipping_province) missing.push("shipping_province");
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Missing required address fields", error_code: "missing_required_fields", fields: missing },
      { status: 400 },
    );
  }

  const setDefault = Boolean(incoming.set_default);
  const addressId = clean(incoming.address_id);

  if (setDefault) {
    const { error: resetErr } = await supabase
      .from("user_saved_addresses")
      .update({ is_default: false })
      .eq("user_id", userId);
    if (resetErr) {
      if (isMissingTableError(resetErr)) {
        return NextResponse.json(
          { ok: false, error: "Saved addresses are not ready yet. Run latest database migrations." },
          { status: 503 },
        );
      }
      return NextResponse.json({ ok: false, error: resetErr.message }, { status: 400 });
    }
  }

  if (addressId) {
    const { data, error } = await supabase
      .from("user_saved_addresses")
      .update({
        ...payload,
        ...(setDefault ? { is_default: true } : {}),
        last_used_at: new Date().toISOString(),
      })
      .eq("id", addressId)
      .eq("user_id", userId)
      .select(
        "id,label,first_name,last_name,phone,shipping_street,shipping_city,shipping_postal_code,shipping_province,shipping_country,is_default,updated_at",
      )
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          { ok: false, error: "Saved addresses are not ready yet. Run latest database migrations." },
          { status: 503 },
        );
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "Address not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, address: data as SavedAddress });
  }

  const { data, error } = await supabase
    .from("user_saved_addresses")
    .insert({
      user_id: userId,
      ...payload,
      is_default: setDefault,
      last_used_at: new Date().toISOString(),
    })
    .select(
      "id,label,first_name,last_name,phone,shipping_street,shipping_city,shipping_postal_code,shipping_province,shipping_country,is_default,updated_at",
    )
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { ok: false, error: "Saved addresses are not ready yet. Run latest database migrations." },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, address: data as SavedAddress });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getOrCreateAppUserId(supabase, user);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = body as AddressMutationPayload;
  const addressId = clean(incoming.address_id);
  if (!addressId) {
    return NextResponse.json({ ok: false, error: "address_id is required" }, { status: 400 });
  }

  const setDefault = Boolean(incoming.set_default);
  const maybeLabel = clean(incoming.label);

  if (setDefault) {
    const { error: resetErr } = await supabase
      .from("user_saved_addresses")
      .update({ is_default: false })
      .eq("user_id", userId);
    if (resetErr) {
      if (isMissingTableError(resetErr)) {
        return NextResponse.json(
          { ok: false, error: "Saved addresses are not ready yet. Run latest database migrations." },
          { status: 503 },
        );
      }
      return NextResponse.json({ ok: false, error: resetErr.message }, { status: 400 });
    }
  }

  const updates: Record<string, unknown> = {
    last_used_at: new Date().toISOString(),
  };
  if (setDefault) updates.is_default = true;
  if (maybeLabel) updates.label = maybeLabel;

  const { data, error } = await supabase
    .from("user_saved_addresses")
    .update(updates)
    .eq("id", addressId)
    .eq("user_id", userId)
    .select(
      "id,label,first_name,last_name,phone,shipping_street,shipping_city,shipping_postal_code,shipping_province,shipping_country,is_default,updated_at",
    )
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { ok: false, error: "Saved addresses are not ready yet. Run latest database migrations." },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Address not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, address: data as SavedAddress });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getOrCreateAppUserId(supabase, user);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = body as AddressMutationPayload;
  const addressId = clean(incoming.address_id);
  if (!addressId) {
    return NextResponse.json({ ok: false, error: "address_id is required" }, { status: 400 });
  }

  const { data: deleted, error: delErr } = await supabase
    .from("user_saved_addresses")
    .delete()
    .eq("id", addressId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (delErr) {
    if (isMissingTableError(delErr)) {
      return NextResponse.json(
        { ok: false, error: "Saved addresses are not ready yet. Run latest database migrations." },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 });
  }
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Address not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
