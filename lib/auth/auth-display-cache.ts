import type { UserNameProfile } from "@/lib/auth/user-display-name";

const CACHE_KEY = "storefront-auth-display-v1";

export type AuthDisplayCache = {
  userId: string;
  email: string | null;
  nameProfile: UserNameProfile | null;
  avatarUrl: string | null;
};

export function readAuthDisplayCache(): AuthDisplayCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("userId" in parsed) ||
      typeof (parsed as AuthDisplayCache).userId !== "string"
    ) {
      return null;
    }
    const row = parsed as AuthDisplayCache;
    return {
      userId: row.userId,
      email: typeof row.email === "string" ? row.email : null,
      nameProfile: row.nameProfile ?? null,
      avatarUrl: typeof row.avatarUrl === "string" ? row.avatarUrl : null,
    };
  } catch {
    return null;
  }
}

export function writeAuthDisplayCache(cache: AuthDisplayCache): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* private mode / quota */
  }
}

export function clearAuthDisplayCache(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
