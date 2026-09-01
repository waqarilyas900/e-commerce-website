import type { User } from "@supabase/supabase-js";

export type UserNameProfile = {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
};

function readMetaString(meta: Record<string, unknown>, key: string): string {
  const value = meta[key];
  return typeof value === "string" ? value.trim() : "";
}

/** Parse Supabase auth metadata, including Google OAuth (`given_name`, `full_name`, etc.). */
export function namePartsFromUserMetadata(
  meta: Record<string, unknown> | null | undefined,
): { first: string; last: string } {
  const m = meta ?? {};
  let first = readMetaString(m, "first_name") || readMetaString(m, "given_name");
  let last = readMetaString(m, "last_name") || readMetaString(m, "family_name");

  if (!first && !last) {
    const full = readMetaString(m, "full_name") || readMetaString(m, "name");
    if (full) {
      const [head, ...tail] = full.split(/\s+/).filter(Boolean);
      first = head ?? "";
      last = tail.join(" ");
    }
  }

  return { first, last };
}

function mergedNameParts(
  user: User,
  profile?: UserNameProfile | null,
): { first: string; last: string } {
  const fromMeta = namePartsFromUserMetadata(
    user.user_metadata as Record<string, unknown> | null | undefined,
  );
  const fromProfile = {
    first: (profile?.first_name ?? "").trim(),
    last: (profile?.last_name ?? "").trim(),
  };

  return {
    first: fromMeta.first || fromProfile.first,
    last: fromMeta.last || fromProfile.last,
  };
}

export function displayNameFromUser(
  user: User,
  profile?: UserNameProfile | null,
): string {
  const { first, last } = mergedNameParts(user, profile);
  const combined = [first, last].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  return user.email?.trim() ?? "";
}

export function avatarInitialsFromUser(
  user: User,
  profile?: UserNameProfile | null,
): string {
  const { first, last } = mergedNameParts(user, profile);
  if (first && last) return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  const email = user.email?.trim();
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export function avatarPhotoUrlFromUser(user: User): string | null {
  const m = user.user_metadata as Record<string, unknown> | null | undefined;
  const url = m?.avatar_url ?? m?.picture;
  return typeof url === "string" && url.length > 0 ? url : null;
}
