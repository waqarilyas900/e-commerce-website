/**
 * Matches Postgres enum `public.user_gender` (see supabase migrations).
 * Use these values in forms and `public.users` upserts — do not invent new strings.
 */
export const USER_GENDER = {
  Unspecified: "unspecified",
  Female: "female",
  Male: "male",
  NonBinary: "non_binary",
  PreferNotToSay: "prefer_not_to_say",
} as const;

export type UserGender = (typeof USER_GENDER)[keyof typeof USER_GENDER];

const LABELS: Record<UserGender, string> = {
  [USER_GENDER.Unspecified]: "Not specified",
  [USER_GENDER.Female]: "Female",
  [USER_GENDER.Male]: "Male",
  [USER_GENDER.NonBinary]: "Non-binary",
  [USER_GENDER.PreferNotToSay]: "Prefer not to say",
};

/** Profile / forms: only these three choices (DB may still store legacy enum values). */
export const USER_GENDER_PROFILE_OPTIONS: { value: UserGender; label: string }[] = [
  { value: USER_GENDER.Male, label: "Male" },
  { value: USER_GENDER.Female, label: "Female" },
  { value: USER_GENDER.PreferNotToSay, label: "Prefer not to say" },
];

export function getUserGenderLabel(g: UserGender): string {
  return LABELS[g];
}

/** @deprecated Use {@link USER_GENDER_PROFILE_OPTIONS} */
export const USER_GENDER_SELECT_OPTIONS = USER_GENDER_PROFILE_OPTIONS;

/** Normalize DB / API string to `UserGender` (unknown → unspecified). */
export function parseUserGender(raw: unknown): UserGender {
  if (typeof raw !== "string") return USER_GENDER.Unspecified;
  const s = raw.trim();
  if ((Object.values(USER_GENDER) as string[]).includes(s)) {
    return s as UserGender;
  }
  return USER_GENDER.Unspecified;
}
