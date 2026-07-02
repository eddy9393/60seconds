import { getSupabaseClient } from "./supabase";
import { APP_CONFIG } from "./config";

export type Profile = {
  user_id: string;
  artist_name?: string | null;
  [key: string]: unknown;
};

export type Track = {
  user_id: string;
  [key: string]: unknown;
};

/** Ported from hasCompletedArtistProfile() in app.js */
export function hasCompletedArtistProfile(profile?: Profile | null): boolean {
  return Boolean(profile && String(profile.artist_name || "").trim());
}

/** Ported from getProfileHref() in app.js */
export function getProfileHref(profile?: Profile | null): string {
  if (!profile) return "/join";
  if (!hasCompletedArtistProfile(profile)) return "/edit-profile?welcome=1";
  if (profile.user_id) return `/artist?user_id=${encodeURIComponent(profile.user_id)}`;
  return "/join";
}

/** Ported from fetchProfileByUserId() in app.js */
export async function fetchProfileByUserId(
  userId?: string | null,
  selectSql = "*"
): Promise<Profile | null> {
  if (!userId) return null;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(selectSql)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Profile) || null;
}

/** Ported from fetchTrackByUserId() in app.js */
export async function fetchTrackByUserId(
  userId?: string | null,
  selectSql = "*"
): Promise<Track | null> {
  if (!userId) return null;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tracks")
    .select(selectSql)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Track) || null;
}

/** Ported from getArtistDisplayNameByUserId() in app.js */
export async function getArtistDisplayNameByUserId(
  userId?: string | null,
  fallbackValue = "Someone",
  currentUser?: { id?: string; email?: string } | null
): Promise<string> {
  if (!userId) return fallbackValue;

  try {
    const profile = await fetchProfileByUserId(userId, "artist_name");
    const artistName = String(profile?.artist_name || "").trim();
    if (artistName) return artistName;
  } catch (err) {
    console.warn("getArtistDisplayNameByUserId profile lookup failed:", err);
  }

  if (currentUser?.id && String(currentUser.id) === String(userId)) {
    const email = String(currentUser.email || "").trim();
    if (email) return email.split("@")[0] || fallbackValue;
  }

  return fallbackValue;
}

/** Ported from fetchLikedTrackIdsForUser() in app.js */
export async function fetchLikedTrackIdsForUser(userId?: string | null): Promise<string[]> {
  if (!userId) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("track_likes")
    .select("track_id")
    .eq("liker_user_id", userId);
  if (error) throw error;
  return Array.isArray(data) ? data.map((row) => String(row.track_id)).filter(Boolean) : [];
}

/** Ported from syncLikedTrackIdsForUser() in app.js — keeps a localStorage mirror */
export async function syncLikedTrackIdsForUser(
  userId?: string | null,
  storageKey: string = APP_CONFIG.radioLikeKey
): Promise<string[]> {
  if (!userId) {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    return [];
  }

  const likedIds = await fetchLikedTrackIdsForUser(userId);
  try {
    localStorage.setItem(storageKey, JSON.stringify(likedIds));
  } catch (err) {
    console.warn("syncLikedTrackIdsForUser localStorage sync failed:", err);
  }
  return likedIds;
}

type ToggleLikeArgs = {
  trackId?: string | null;
  artistUserId?: string | null;
  likerUserId?: string | null;
};

type ToggleLikeResult = {
  liked: boolean;
  changed: boolean;
  ownTrack?: boolean;
  likeId?: string | null;
  error: Error | null;
};

/** Ported from toggleTrackLikeInSupabase() in app.js */
export async function toggleTrackLikeInSupabase({
  trackId,
  artistUserId,
  likerUserId,
}: ToggleLikeArgs): Promise<ToggleLikeResult> {
  const safeTrackId = String(trackId || "").trim();
  const safeArtistUserId = String(artistUserId || "").trim();
  const safeLikerUserId = String(likerUserId || "").trim();

  if (!safeTrackId || !safeLikerUserId) {
    return { liked: false, changed: false, error: new Error("Missing track or user for like toggle.") };
  }

  if (safeArtistUserId && safeArtistUserId === safeLikerUserId) {
    return {
      liked: false,
      changed: false,
      ownTrack: true,
      error: new Error("You cannot like your own tune."),
    };
  }

  const supabase = getSupabaseClient();
  const existingResponse = await supabase
    .from("track_likes")
    .select("id")
    .eq("track_id", safeTrackId)
    .eq("liker_user_id", safeLikerUserId)
    .maybeSingle();

  if (existingResponse.error && existingResponse.error.code !== "PGRST116") {
    return { liked: false, changed: false, error: existingResponse.error };
  }

  const existingLikeId = existingResponse.data?.id || null;

  if (existingLikeId) {
    const deleteResponse = await supabase.from("track_likes").delete().eq("id", existingLikeId);
    if (deleteResponse.error) {
      return { liked: true, changed: false, error: deleteResponse.error };
    }
    return { liked: false, changed: true, likeId: null, error: null };
  }

  const insertResponse = await supabase
    .from("track_likes")
    .insert({
      track_id: safeTrackId,
      liker_user_id: safeLikerUserId,
      artist_user_id: safeArtistUserId || null,
    })
    .select("id")
    .single();

  if (insertResponse.error) {
    return { liked: false, changed: false, error: insertResponse.error };
  }

  return { liked: true, changed: true, likeId: insertResponse.data?.id || null, error: null };
}

/** Ported from uploadPhotoIfNeeded() in join.js */
export async function uploadArtistPhoto(userId: string, photoFile: File | null | undefined): Promise<string> {
  if (!photoFile) return "";
  const supabase = getSupabaseClient();
  const cleanName = photoFile.name.replace(/\s+/g, "-");
  const photoPath = `${userId}/${Date.now()}-${cleanName}`;

  const { error } = await supabase.storage.from("artist-photos").upload(photoPath, photoFile, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = supabase.storage.from("artist-photos").getPublicUrl(photoPath);
  return data.publicUrl;
}

/** Ported from saveProfileWithoutUpsert() in join.js */
export async function saveArtistProfile(
  profilePayload: Record<string, unknown>,
  userId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error(`Could not check existing profile: ${existingProfileError.message}`);
  }

  if (existingProfile) {
    const { error: updateError } = await supabase.from("profiles").update(profilePayload).eq("user_id", userId);
    if (updateError) throw new Error(`Saving profile failed: ${updateError.message}`);
    return;
  }

  const { error: insertError } = await supabase.from("profiles").insert([profilePayload]);
  if (insertError) throw new Error(`Saving profile failed: ${insertError.message}`);
}

const PROFILE_SELECT_FIELDS =
  "artist_name, bio, nationality, music_roles, music_role, city, date_of_birth, social_link, photo_url, wants_promotions, accepted_terms, user_id, coins, show_role_on_artist_page, show_city_on_artist_page, show_birth_on_artist_page";

/** Ported from ensureProfileRecord() in edit-profile.js — inserts a blank
 * profile row if the user doesn't have one yet (e.g. after email confirm). */
export async function ensureProfileRecord(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { error: insertError } = await supabase.from("profiles").insert([{ user_id: userId }]);
  if (insertError && insertError.code !== "23505") throw insertError;

  const { data, error: reloadError } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_FIELDS)
    .eq("user_id", userId)
    .maybeSingle();
  if (reloadError) throw reloadError;
  return (data as unknown as Profile) || null;
}

/** Ported from loadMyProfile() in edit-profile.js — like fetchProfileByUserId
 * but auto-creates a blank row when one doesn't exist yet. */
export async function loadOrCreateProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("profiles").select(PROFILE_SELECT_FIELDS).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (data) return data as unknown as Profile;
  return ensureProfileRecord(userId);
}

/** Ported from handleSaveProfile()'s update payload in edit-profile.js */
export async function updateArtistProfile(userId: string, payload: Record<string, unknown>): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("profiles").update(payload).eq("user_id", userId);
  if (error) throw new Error(`Saving profile failed: ${error.message}`);
}

const UNREAD_NOTIFICATIONS_KEY = "ssfm_has_unread_notifications_v1";

/** Ported from hasUnreadNotifications() in app.js */
export function hasUnreadNotifications(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(UNREAD_NOTIFICATIONS_KEY) === "1";
}

/** Ported from setUnreadNotificationsFlag() in app.js */
export function setUnreadNotificationsFlag(hasUnread: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(UNREAD_NOTIFICATIONS_KEY, hasUnread ? "1" : "0");
}

/** Ported from syncUnreadNotificationsFlagForUser() in app.js */
export async function syncUnreadNotificationsFlagForUser(userId?: string | null): Promise<boolean> {
  if (!userId) {
    setUnreadNotificationsFlag(false);
    return false;
  }

  try {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    const hasUnread = Number(count || 0) > 0;
    setUnreadNotificationsFlag(hasUnread);
    return hasUnread;
  } catch (err) {
    console.error("syncUnreadNotificationsFlagForUser error:", err);
    return false;
  }
}

/** Ported from trackSiteVisit() in app.js — fire-and-forget analytics ping */
export async function trackSiteVisit(pathname: string, userId?: string | null) {
  const skipPages = new Set(["/admin"]);
  if (skipPages.has(pathname)) return;

  const VISITOR_KEY = "ssfm_site_visitor_key_v1";
  const SESSION_KEY = "ssfm_site_session_key_v1";
  const GUARD_PREFIX = "ssfm_site_visit_seen_v1:";
  const guardKey = `${GUARD_PREFIX}${pathname}`;

  try {
    if (sessionStorage.getItem(guardKey) === "1") return;
  } catch {
    // ignore
  }

  const generateKey = (prefix: string) => {
    try {
      if (window.crypto?.randomUUID) return `${prefix}${window.crypto.randomUUID()}`;
    } catch {
      // ignore
    }
    return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  };

  const getPersistentVisitorKey = () => {
    try {
      let key = localStorage.getItem(VISITOR_KEY);
      if (!key) {
        key = generateKey("visitor_");
        localStorage.setItem(VISITOR_KEY, key);
      }
      return key;
    } catch {
      return generateKey("visitor_");
    }
  };

  const getSessionVisitKey = () => {
    try {
      let key = sessionStorage.getItem(SESSION_KEY);
      if (!key) {
        key = generateKey("session_");
        sessionStorage.setItem(SESSION_KEY, key);
      }
      return key;
    } catch {
      return generateKey("session_");
    }
  };

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("site_visit_events").insert({
    visitor_key: getPersistentVisitorKey(),
    session_key: getSessionVisitKey(),
    path: pathname || "/",
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
    user_id: userId || null,
  });

  if (!error) {
    try {
      sessionStorage.setItem(guardKey, "1");
    } catch {
      // ignore
    }
    return;
  }

  const message = String(error.message || "").toLowerCase();
  const code = String(error.code || "").toLowerCase();
  const harmless =
    ["42p01", "42501"].includes(code) ||
    message.includes("site_visit_events") ||
    message.includes("permission denied") ||
    message.includes("violates row-level security");

  if (!harmless) {
    console.warn("trackSiteVisit failed:", error);
  }
}
