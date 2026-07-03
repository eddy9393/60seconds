import { getSupabaseClient } from "./supabase";

export type ArtistProfile = {
  user_id: string;
  artist_name: string | null;
  photo_url: string | null;
  bio: string | null;
  social_link: string | null;
  nationality: string | null;
  created_at: string | null;
  date_of_birth: string | null;
  music_roles: string[] | null;
  music_role?: string | null;
  city: string | null;
};

export type ArtistTrack = {
  id: string;
  title: string | null;
  artist: string | null;
  file_url: string;
  created_at: string | null;
  status: string;
  user_id: string;
  preview_start_seconds: number | null;
  preview_duration_seconds: number | null;
  genre_primary: string | null;
  genre_secondary: string | null;
  feeling_tags: string[] | null;
  artist_page_full_track: boolean | null;
};

/** Ported from fetchArtistProfile() in artist.js */
export async function fetchArtistProfile(userId: string): Promise<ArtistProfile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("public_artist_profiles")
    .select("user_id, artist_name, photo_url, bio, social_link, nationality, created_at, date_of_birth, music_roles, city")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Could not load artist profile: ${error.message}`);
  return (data as unknown as ArtistProfile) || null;
}

/** Ported from fetchApprovedTracks() in artist.js */
export async function fetchApprovedTracks(userId: string): Promise<ArtistTrack[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tracks")
    .select(
      "id, title, artist, file_url, created_at, status, user_id, preview_start_seconds, preview_duration_seconds, genre_primary, genre_secondary, feeling_tags, artist_page_full_track"
    )
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("fetchApprovedTracks error (may be RLS):", error.message);
    return [];
  }
  return (data as unknown as ArtistTrack[]) || [];
}

/** Ported from recordProfileVisitIfNeeded() in artist.js */
export async function recordProfileVisit(profileUserId: string, viewerUserId: string) {
  if (!profileUserId || !viewerUserId || profileUserId === viewerUserId) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("record_profile_daily_visit", {
    p_profile_user_id: profileUserId,
    p_viewer_user_id: viewerUserId,
  });
  if (error) console.error("record_profile_daily_visit error:", error);
}

const MONTH_MAP: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
  "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};
const MONTH_MAP_FULL: Record<string, string> = {
  "01": "January", "02": "February", "03": "March", "04": "April", "05": "May", "06": "June",
  "07": "July", "08": "August", "09": "September", "10": "October", "11": "November", "12": "December",
};

/** Ported from formatDate() in artist.js */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Ported from getMemberSinceDisplay() in artist.js */
export function getMemberSinceDisplay(rawValue?: string | null): string {
  if (!rawValue) return "—";
  const parsed = new Date(rawValue);
  if (!Number.isNaN(parsed.getTime())) {
    const month = parsed.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
    const year = parsed.toLocaleDateString("en-GB", { year: "numeric", timeZone: "UTC" });
    return `${month} ${year}`;
  }
  const raw = String(rawValue).trim();
  if (raw.length >= 7) {
    const year = raw.slice(0, 4);
    const monthNum = raw.slice(5, 7);
    if (MONTH_MAP[monthNum] && /^\d{4}$/.test(year)) return `${MONTH_MAP[monthNum]} ${year}`;
  }
  return "—";
}

/** Ported from getBirthdayDisplay() in artist.js */
export function getBirthdayDisplay(rawValue?: string | null): string {
  if (!rawValue) return "";
  const parsed = new Date(rawValue);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
  }
  const raw = String(rawValue).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, , monthNum, dayNum] = match;
    if (MONTH_MAP_FULL[monthNum]) return `${Number(dayNum)} ${MONTH_MAP_FULL[monthNum]}`;
  }
  return "";
}

/** Ported from formatTime() in artist.js (track-card player clock, 0-padded seconds) */
export function formatPlayerTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
