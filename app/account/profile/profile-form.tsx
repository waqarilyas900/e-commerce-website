"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { GroupBase, StylesConfig } from "react-select";
import { toast } from "sonner";
import {
  USER_GENDER,
  USER_GENDER_PROFILE_OPTIONS,
  parseUserGender,
  type UserGender,
} from "@/lib/enums/user-gender";
import { ProfilePhoneField } from "@/components/account/profile-phone-field";
import type { AppSelectOption } from "@/components/ui/app-select";
import { AppSelect } from "@/components/ui/app-select";
import { createClient } from "@/lib/supabase/client";

function readNames(meta: Record<string, unknown>) {
  const first = typeof meta.first_name === "string" ? meta.first_name.trim() : "";
  const last = typeof meta.last_name === "string" ? meta.last_name.trim() : "";
  return { first, last };
}

const inputClass =
  "h-[42px] w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/15 disabled:opacity-60";

const inputReadonlyClass =
  "h-[42px] w-full cursor-not-allowed rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-600";

/** Profile gender field: only Male / Female / Prefer not to say (matches DB subset). */
const PROFILE_GENDER_VALUES = new Set<UserGender>([
  USER_GENDER.Male,
  USER_GENDER.Female,
  USER_GENDER.PreferNotToSay,
]);

const GENDER_SELECT_OPTIONS: AppSelectOption[] = USER_GENDER_PROFILE_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
}));

const profileGenderSelectStyles: StylesConfig<
  AppSelectOption,
  false,
  GroupBase<AppSelectOption>
> = {
  menuPortal: (base) => ({ ...base, zIndex: 100_000 }),
};

/** Matches `AppSelect` control: minHeight 42, rounded-lg — same pulse treatment as collection listing toolbars. */
const selectControlSkeletonClass =
  "h-[42px] w-full animate-pulse rounded-lg bg-neutral-100";

const inputFieldSkeletonClass =
  "h-[42px] w-full animate-pulse rounded-lg bg-neutral-100";

function LabelSkeleton() {
  return <div className="mb-1.5 h-4 w-24 max-w-[40%] animate-pulse rounded bg-neutral-100" />;
}

export function ProfileFormSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <LabelSkeleton />
          <div className={inputFieldSkeletonClass} />
        </div>
        <div>
          <LabelSkeleton />
          <div className={inputFieldSkeletonClass} />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <div>
            <LabelSkeleton />
            <div className={inputFieldSkeletonClass} />
          </div>
          <div>
            <LabelSkeleton />
            <div className={inputFieldSkeletonClass} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <LabelSkeleton />
          <div className={selectControlSkeletonClass} />
        </div>
        <div>
          <LabelSkeleton />
          <div className={inputFieldSkeletonClass} />
        </div>
      </div>

      <div className="mt-2 h-10 w-28 animate-pulse rounded-full bg-neutral-100" />
    </div>
  );
}

function formatSignupProvider(provider: string) {
  const labels: Record<string, string> = {
    email: "Email & password",
    google: "Google",
    github: "GitHub",
    apple: "Apple",
    unknown: "—",
  };
  return labels[provider] ?? provider;
}

export function ProfileForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<UserGender>(USER_GENDER.Unspecified);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [signupProvider, setSignupProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const genderValue = useMemo(() => {
    if (!PROFILE_GENDER_VALUES.has(gender)) return null;
    return GENDER_SELECT_OPTIONS.find((o) => o.value === gender) ?? null;
  }, [gender]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user) return;
        setEmail(user.email ?? "");
        const m = readNames((user.user_metadata ?? {}) as Record<string, unknown>);

        const { data: row, error: rowErr } = await supabase
          .from("users")
          .select(
            "first_name,last_name,phone,gender,date_of_birth,signup_provider",
          )
          .eq("auth_id", user.id)
          .maybeSingle();

        if (!cancelled && !rowErr && row) {
          setFirst((row.first_name ?? "").trim() || m.first);
          setLast((row.last_name ?? "").trim() || m.last);
          setPhone((row.phone ?? "").trim());
          setGender(parseUserGender(row.gender));
          setDateOfBirth(
            row.date_of_birth
              ? String(row.date_of_birth).slice(0, 10)
              : "",
          );
          if (row.signup_provider) {
            setSignupProvider(row.signup_provider);
          }
        } else {
          setFirst(m.first);
          setLast(m.last);
        }
      } catch {
        if (!cancelled) toast.error("Could not load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You are not signed in.");
        return;
      }

      const fn = first.trim();
      const ln = last.trim();
      const ph = phone.trim();
      const dob = dateOfBirth.trim() || null;

      const { error: upErr } = await supabase.auth.updateUser({
        data: {
          first_name: fn,
          last_name: ln,
        },
      });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }

      const { error: dbErr } = await supabase.from("users").upsert(
        {
          auth_id: user.id,
          first_name: fn,
          last_name: ln,
          phone: ph,
          gender,
          date_of_birth: dob,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "auth_id" },
      );

      if (dbErr) {
        toast.error(dbErr.message);
        return;
      }

      toast.success("Profile saved successfully.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <ProfileFormSkeleton />;
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      {signupProvider && signupProvider !== "unknown" ? (
        <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
          <span className="font-medium text-neutral-900">How you signed up</span>
          {": "}
          {formatSignupProvider(signupProvider)}
          <span className="mt-1.5 block text-xs leading-relaxed text-neutral-500">
            We save this with your profile so our team can verify your account when you contact support.
            If you use Google or another provider, that sign-in is managed in your account security
            settings.
          </span>
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="profile-first" className="mb-1.5 block text-sm font-medium text-neutral-800">
            First name
          </label>
          <input
            id="profile-first"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            autoComplete="given-name"
            disabled={saving}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="profile-last" className="mb-1.5 block text-sm font-medium text-neutral-800">
            Last name
          </label>
          <input
            id="profile-last"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            autoComplete="family-name"
            disabled={saving}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <div>
            <label htmlFor="profile-email" className="mb-1.5 block text-sm font-medium text-neutral-800">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={email}
              readOnly
              aria-readonly="true"
              className={inputReadonlyClass}
            />
          </div>
          <div>
            <label htmlFor="profile-phone" className="mb-1.5 block text-sm font-medium text-neutral-800">
              Phone number
            </label>
            <ProfilePhoneField
              id="profile-phone"
              value={phone}
              onChange={setPhone}
              disabled={saving}
              lockCountry
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="profile-gender" className="mb-1.5 block text-sm font-medium text-neutral-800">
            Gender
          </label>
          <AppSelect
            inputId="profile-gender"
            options={GENDER_SELECT_OPTIONS}
            value={genderValue}
            onChange={(opt) => {
              if (opt) setGender(parseUserGender(opt.value));
            }}
            placeholder="Select gender"
            isDisabled={saving}
            isSearchable={false}
            isClearable={false}
            menuPlacement="auto"
            menuShouldScrollIntoView={false}
            styles={profileGenderSelectStyles}
          />
        </div>
        <div>
          <label htmlFor="profile-dob" className="mb-1.5 block text-sm font-medium text-neutral-800">
            Date of birth
          </label>
          <input
            id="profile-dob"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            disabled={saving}
            className={`${inputClass} min-h-[42px] py-0 leading-normal`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-2 rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:opacity-60"
      >
        {saving ? "Updating…" : "Update"}
      </button>
    </form>
  );
}
