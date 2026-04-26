import { createClient } from "@/lib/supabase/server";
import { isEffectivelyEmptyHtml } from "./html-content";
import { sanitizeRichHtml, sanitizeRichHtmlList } from "@/lib/sanitize-rich-html";
import type { AnnouncementBarSettings, HeroSlide } from "./store-brand.types";

const DEFAULT_ANNOUNCEMENT_BG = "#1c1d1d";
const DEFAULT_ANNOUNCEMENT_FG = "#ffffff";
const DEFAULT_ROTATION_MS = 5000;
const MIN_ROTATION_MS = 3000;
const MAX_ROTATION_MS = 12000;

function clampRotationMs(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_ROTATION_MS;
  return Math.min(MAX_ROTATION_MS, Math.max(MIN_ROTATION_MS, Math.round(n)));
}

function parseAnnouncementMessagesJson(raw: unknown): string[] {
  const out: string[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const s = typeof item === "string" ? item : String(item ?? "");
      if (!isEffectivelyEmptyHtml(s)) {
        out.push(s.trim());
      }
    }
  }
  return out;
}

function parseCssHex(input: string | null | undefined, fallback: string): string {
  if (!input || typeof input !== "string") return fallback;
  const t = input.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) return t;
  if (/^#[0-9A-Fa-f]{3}$/i.test(t)) {
    const h = t.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return fallback;
}

/**
 * Loads announcement bar settings for the root layout. On failure, returns defaults that
 * mirror the legacy strip (empty messages + default colors until `home_page_settings` is configured).
 */
export async function getAnnouncementBarForLayout(): Promise<AnnouncementBarSettings> {
  const fallback: AnnouncementBarSettings = {
    enabled: true,
    messages: [],
    rotationIntervalMs: DEFAULT_ROTATION_MS,
    html: "",
    backgroundColor: DEFAULT_ANNOUNCEMENT_BG,
    textColor: DEFAULT_ANNOUNCEMENT_FG,
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("home_page_settings")
      .select(
        "announcement_html, announcement_messages, announcement_rotation_ms, announcement_bar_bg, announcement_bar_fg, announcement_enabled",
      )
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      return fallback;
    }

    const rawMessages = parseAnnouncementMessagesJson(data.announcement_messages);
    // Sanitize on the server so client components only render trusted HTML and
    // we never pull a server-side DOM (jsdom) into the storefront bundle.
    const messages = sanitizeRichHtmlList(rawMessages);
    const html = messages[0] ?? "";

    const rawMs = data.announcement_rotation_ms;
    const rotationIntervalMs = clampRotationMs(
      typeof rawMs === "number" ? rawMs : Number(rawMs),
    );

    return {
      enabled: data.announcement_enabled !== false,
      messages,
      rotationIntervalMs,
      html,
      backgroundColor: parseCssHex(data.announcement_bar_bg, DEFAULT_ANNOUNCEMENT_BG),
      textColor: parseCssHex(data.announcement_bar_fg, DEFAULT_ANNOUNCEMENT_FG),
    };
  } catch {
    return fallback;
  }
}

/**
 * Homepage hero + mission copy from Supabase only. No catalog defaults — if empty or
 * unavailable, the storefront shows nothing for those blocks.
 */
export async function getHomeMarketingData(): Promise<{
  slides: HeroSlide[];
  missionParagraph: string;
}> {
  const empty = { slides: [] as HeroSlide[], missionParagraph: "" };

  try {
    const supabase = await createClient();
    const [settingsRes, slidesRes] = await Promise.all([
      supabase.from("home_page_settings").select("mission_paragraph").eq("id", 1).maybeSingle(),
      supabase
        .from("home_hero_slides")
        .select("id, title, image_url, href, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (settingsRes.error || slidesRes.error) {
      return empty;
    }

    const rawMission = settingsRes.data?.mission_paragraph ?? "";
    const missionParagraph = isEffectivelyEmptyHtml(rawMission)
      ? ""
      : sanitizeRichHtml(rawMission);

    const rows = slidesRes.data ?? [];
    const slides: HeroSlide[] = rows.flatMap((r) => {
      const title = (r.title ?? "").trim();
      const image = (r.image_url ?? "").trim();
      if (!title || !image) return [];
      return [
        {
          id: r.id,
          title,
          href: (r.href && r.href.trim()) || "/",
          image,
        } satisfies HeroSlide,
      ];
    });

    return {
      slides,
      missionParagraph,
    };
  } catch {
    return empty;
  }
}
