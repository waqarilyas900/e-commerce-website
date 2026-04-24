import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { validateContactImages } from "@/app/lib/contact-upload-rules";
import { sendContactInquiryEmail } from "@/lib/email/send-contact-message";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  removeContactInquiryObjects,
  uploadContactInquiryImages,
} from "@/lib/supabase/contact-inquiry-upload";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

type JsonBody = {
  name?: string;
  email?: string;
  message?: string;
};

function isFileEntry(v: FormDataEntryValue): v is File {
  return typeof File !== "undefined" && v instanceof File;
}

function parseContactFields(name: string, email: string, message: string) {
  const n = name.trim();
  const em = email.trim();
  const msg = message.trim();

  if (n.length < 2) {
    return { ok: false as const, error: "Please enter your name." };
  }
  if (!em || !em.includes("@")) {
    return { ok: false as const, error: "Please enter a valid email." };
  }
  if (msg.length < 10) {
    return {
      ok: false as const,
      error: "Please enter a message (at least a few words).",
    };
  }
  return { ok: true as const, name: n, email: em, message: msg };
}

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`contact:${ip}`, 10, 15 * 60 * 1000);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterMs);
  }

  const contentType = req.headers.get("content-type") ?? "";

  let name: string;
  let email: string;
  let message: string;
  let imageFiles: File[] = [];

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid form data." }, { status: 400 });
    }
    name = String(form.get("name") ?? "");
    email = String(form.get("email") ?? "");
    message = String(form.get("message") ?? "");
    imageFiles = form.getAll("attachments").filter(isFileEntry);
  } else {
    let body: JsonBody;
    try {
      body = (await req.json()) as JsonBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }
    name = typeof body.name === "string" ? body.name : "";
    email = typeof body.email === "string" ? body.email : "";
    message = typeof body.message === "string" ? body.message : "";
    imageFiles = [];
  }

  const parsed = parseContactFields(name, email, message);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const validated = validateContactImages(imageFiles);
  if (!validated.ok) {
    const first = validated.errors[0];
    return NextResponse.json(
      { ok: false, error: first?.message ?? "Invalid attachments." },
      { status: 400 },
    );
  }

  const files = validated.files;
  const admin = createServiceRoleSupabase();
  let uploadedPaths: string[] = [];
  let imageUrls: string[] = [];

  if (files.length > 0) {
    if (!admin) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Image uploads are not configured. Add SUPABASE_SERVICE_ROLE_KEY on the server, or send your message without attachments.",
        },
        { status: 503 },
      );
    }

    const inquiryId = randomUUID();
    const up = await uploadContactInquiryImages(admin, inquiryId, files);
    if (!up.ok) {
      return NextResponse.json(
        { ok: false, error: up.message ?? "Could not upload images." },
        { status: 503 },
      );
    }
    uploadedPaths = up.uploads.map((u) => u.path);
    imageUrls = up.uploads.map((u) => u.publicUrl);
  }

  const result = await sendContactInquiryEmail({
    fromName: parsed.name,
    fromEmail: parsed.email,
    message: parsed.message,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
  });

  if (admin) {
    const { error: insertErr } = await admin.from("contact_inquiries").insert({
      from_name: parsed.name,
      from_email: parsed.email,
      message: parsed.message,
      image_urls: imageUrls,
      email_sent: result.sent,
      email_error: result.sent ? null : (result.error ?? "Email send failed"),
    });

    if (insertErr) {
      if (uploadedPaths.length > 0) {
        await removeContactInquiryObjects(admin, uploadedPaths);
      }
      return NextResponse.json(
        { ok: false, error: insertErr.message ?? "Could not save inquiry." },
        { status: 503 },
      );
    }
  }

  if (!result.sent) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Could not send message." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
