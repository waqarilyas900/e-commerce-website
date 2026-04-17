import { NextResponse } from "next/server";
import { sendContactInquiryEmail } from "@/lib/email/send-contact-message";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

type Body = {
  name?: string;
  email?: string;
  message?: string;
};

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`contact:${ip}`, 10, 15 * 60 * 1000);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterMs);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "Please enter your name." }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json(
      { ok: false, error: "Please enter a message (at least a few words)." },
      { status: 400 },
    );
  }

  const result = await sendContactInquiryEmail({ fromName: name, fromEmail: email, message });
  if (!result.sent) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Could not send message." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
