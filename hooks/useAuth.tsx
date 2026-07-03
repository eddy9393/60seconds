"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import { APP_CONFIG } from "@/lib/config";
import {
  fetchProfileByUserId,
  fetchTrackByUserId,
  syncLikedTrackIdsForUser,
  syncUnreadNotificationsFlagForUser,
  type Profile,
  type Track,
} from "@/lib/profile";

type AuthState = {
  user: User | null;
  profile: Profile | null;
  track: Track | null;
  coins: number;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** Ported from clearInvalidSessionSafe() in app.js */
async function clearInvalidSessionSafe() {
  const supabase = getSupabaseClient();
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (localErr) {
    try {
      await supabase.auth.signOut();
    } catch (signOutErr) {
      console.warn("clearInvalidSessionSafe signOut failed:", signOutErr || localErr);
    }
  }
}

/** Ported from getCurrentUserSafe() in app.js */
async function getCurrentUserSafe(): Promise<User | null> {
  const supabase = getSupabaseClient();
  const sessionResponse = await supabase.auth.getSession();
  if (sessionResponse.error) throw sessionResponse.error;

  const sessionUser = sessionResponse.data?.session?.user || null;
  if (!sessionUser) return null;

  const userResponse = await supabase.auth.getUser();
  if (userResponse.error) {
    await clearInvalidSessionSafe();
    return null;
  }

  const verifiedUser = userResponse.data?.user || null;
  if (!verifiedUser) {
    await clearInvalidSessionSafe();
    return null;
  }

  return verifiedUser;
}

function readCoinsSnapshot(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(APP_CONFIG.profileRuntimeStateKey);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    return Math.max(0, Math.floor(Number(data.coins) || 0));
  } catch {
    return 0;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadForUser = useCallback(async (nextUser: User | null) => {
    setUser(nextUser);

    if (!nextUser) {
      setProfile(null);
      setTrack(null);
      setCoins(0);
      await syncLikedTrackIdsForUser(null);
      return;
    }

    setCoins(readCoinsSnapshot());

    try {
      const [profileResult, trackResult] = await Promise.all([
        fetchProfileByUserId(nextUser.id),
        fetchTrackByUserId(nextUser.id),
      ]);
      setProfile(profileResult);
      setTrack(trackResult);
    } catch (err) {
      console.warn("AuthProvider profile/track load failed:", err);
    }

    syncLikedTrackIdsForUser(nextUser.id).catch((err) =>
      console.warn("AuthProvider likes sync failed:", err)
    );
    syncUnreadNotificationsFlagForUser(nextUser.id).catch((err) =>
      console.warn("AuthProvider notifications sync failed:", err)
    );
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const [profileResult, trackResult] = await Promise.all([
        fetchProfileByUserId(user.id),
        fetchTrackByUserId(user.id),
      ]);
      setProfile(profileResult);
      setTrack(trackResult);
    } catch (err) {
      console.warn("refreshProfile failed:", err);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseClient();

    (async () => {
      try {
        const currentUser = await getCurrentUserSafe();
        if (!cancelled) await loadForUser(currentUser);
      } catch (err) {
        console.warn("AuthProvider initial session check failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      loadForUser(session?.user || null);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [loadForUser]);

  // Mirrors bindRuntimeCurrencySync() in app.js — coins can be updated by
  // other pages/tabs via localStorage + a custom event.
  useEffect(() => {
    const sync = () => setCoins(readCoinsSnapshot());
    const onStorage = (event: StorageEvent) => {
      if (event.key === APP_CONFIG.profileRuntimeStateKey) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("ssfm:coins-updated", sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ssfm:coins-updated", sync);
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    await loadForUser(null);
  }, [loadForUser]);

  const value = useMemo<AuthState>(
    () => ({ user, profile, track, coins, loading, signOut, refreshProfile }),
    [user, profile, track, coins, loading, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
