"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  clearAuthDisplayCache,
  readAuthDisplayCache,
  writeAuthDisplayCache,
  type AuthDisplayCache,
} from "@/lib/auth/auth-display-cache";
import { loadUserNameProfile } from "@/lib/auth/load-user-name-profile";
import {
  avatarPhotoUrlFromUser,
  type UserNameProfile,
} from "@/lib/auth/user-display-name";
import {
  clearPasswordRecoveryFlow,
  isPasswordRecoverySession,
  markPasswordRecoveryFlow,
} from "@/lib/auth/password-recovery-session";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  nameProfile: UserNameProfile | null;
  /** True after the first `getSession()` resolves. */
  authReady: boolean;
  signOut: () => Promise<void>;
  /** Re-fetch display name from `users` (e.g. after profile save). */
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function cacheFromUser(user: User, nameProfile: UserNameProfile | null): AuthDisplayCache {
  return {
    userId: user.id,
    email: user.email?.trim() ?? null,
    nameProfile,
    avatarUrl: avatarPhotoUrlFromUser(user),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  /** Start null so SSR and the first client paint match; cache hydrates in `useEffect`. */
  const [nameProfile, setNameProfile] = useState<UserNameProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const profileFetchGen = useRef(0);

  const applyProfileForUser = useCallback(async (nextUser: User, force = false) => {
    const cached = readAuthDisplayCache();
    if (!force && cached?.userId === nextUser.id && cached.nameProfile) {
      setNameProfile(cached.nameProfile);
    }

    const gen = ++profileFetchGen.current;
    const profile = await loadUserNameProfile(nextUser.id);
    if (gen !== profileFetchGen.current) return;
    setNameProfile(profile);
    writeAuthDisplayCache(cacheFromUser(nextUser, profile));
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      const supabase = createClient();
      const cached = readAuthDisplayCache();
      if (cached?.nameProfile) {
        setNameProfile(cached.nameProfile);
      }

      void supabase.auth.getSession().then(({ data: { session: s } }) => {
        setSession(s ?? null);
        const nextUser = s?.user ?? null;
        setUser(nextUser);
        if (nextUser) {
          void applyProfileForUser(nextUser);
        } else {
          setNameProfile(null);
          clearAuthDisplayCache();
        }
        setAuthReady(true);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, nextSession) => {
        setSession(nextSession ?? null);
        const nextUser = nextSession?.user ?? null;
        setUser(nextUser);

        if (nextUser) {
          void applyProfileForUser(nextUser, event === "SIGNED_IN" || event === "USER_UPDATED");
        } else {
          profileFetchGen.current += 1;
          setNameProfile(null);
          clearAuthDisplayCache();
        }

        if (event === "PASSWORD_RECOVERY" && nextSession) {
          markPasswordRecoveryFlow();
        }
        if (event === "SIGNED_OUT" || !nextSession) {
          clearPasswordRecoveryFlow();
        } else if (
          event === "SIGNED_IN" &&
          nextSession &&
          !isPasswordRecoverySession(nextSession)
        ) {
          clearPasswordRecoveryFlow();
        }

        setAuthReady(true);
      });

      unsubscribe = () => subscription.unsubscribe();
    } catch {
      queueMicrotask(() => setAuthReady(true));
    }

    return () => unsubscribe?.();
  }, [applyProfileForUser]);

  const signOut = useCallback(async () => {
    clearPasswordRecoveryFlow();
    clearAuthDisplayCache();
    profileFetchGen.current += 1;
    setSession(null);
    setUser(null);
    setNameProfile(null);
    const supabase = createClient();
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await applyProfileForUser(user, true);
  }, [applyProfileForUser, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      nameProfile,
      authReady,
      signOut,
      refreshProfile,
    }),
    [session, user, nameProfile, authReady, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
