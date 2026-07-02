import { getSupabaseClient } from "./supabase";
import { getFlagEmoji } from "./countries";
import { isCurrentSupabaseDailyDate, normalizeSupabaseDate } from "./radio";

export type FeaturedArtist = {
  user_id: string;
  artist_name: string | null;
  photo_url: string | null;
  bio: string | null;
  nationality: string | null;
  city: string | null;
  show_city_on_artist_page: boolean | null;
  music_roles: string[] | null;
  track_title: string | null;
};

const DAILY_SECONDS_LIMIT = 10;

/** Ported from loadFeaturedArtists() in featured-artists.js */
export async function fetchFeaturedArtists(): Promise<FeaturedArtist[]> {
  const supabase = getSupabaseClient();

  const tracksResult = await supabase.from("tracks").select("user_id, title").eq("status", "approved");
  if (tracksResult.error || !tracksResult.data?.length) return [];

  const trackMap = new Map<string, string>();
  tracksResult.data.forEach((t) => {
    if (t.user_id) trackMap.set(t.user_id, t.title);
  });
  const approvedUserIds = Array.from(trackMap.keys());
  if (!approvedUserIds.length) return [];

  const profilesResult = await supabase
    .from("profiles")
    .select("user_id, artist_name, photo_url, bio, nationality, city, show_city_on_artist_page, music_roles")
    .in("user_id", approvedUserIds)
    .not("artist_name", "is", null)
    .neq("artist_name", "")
    .limit(20);

  if (profilesResult.error || !profilesResult.data?.length) return [];

  const artists = profilesResult.data.map((p) => ({
    ...p,
    track_title: trackMap.get(p.user_id) || null,
  })) as FeaturedArtist[];

  // Shuffle, matching the original's `.sort(() => Math.random() - 0.5)`
  return artists.sort(() => Math.random() - 0.5);
}

export function formatArtistRoles(roles?: string[] | null): string {
  if (!Array.isArray(roles) || !roles.length) return "";
  return roles
    .filter((r) => r && r !== "none")
    .map((r) => r.charAt(0).toUpperCase() + r.slice(1))
    .join(" · ");
}

export function getArtistNationalityLabel(nationality?: string | null): string {
  if (!nationality) return "";
  const flag = getFlagEmoji(nationality);
  return `${flag ? `${flag} ` : ""}${nationality.toUpperCase()}`;
}

export type NewsFeedItem = {
  type: "join" | "approved_track" | "support_today";
  name: string;
  user_id: string;
  photo_url: string;
  track_title?: string;
  sortTime: number;
};

const NEWS_FEED_JOIN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const NEWS_FEED_TRACK_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** Ported from loadNewsFeed() in index.js */
export async function fetchNewsFeed(): Promise<NewsFeedItem[]> {
  const supabase = getSupabaseClient();
  const nowMs = Date.now();

  const [profilesRes, approvedTracksRes, supportersRes, trackArtistsRes] = await Promise.all([
    supabase
      .from("public_artist_profiles")
      .select("artist_name, created_at, user_id, photo_url")
      .not("artist_name", "is", null)
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("tracks")
      .select("title, artist, user_id, created_at, status")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("profiles")
      .select("artist_name, user_id, photo_url, daily_seconds_earned, daily_seconds_earned_date")
      .not("artist_name", "is", null)
      .gte("daily_seconds_earned", DAILY_SECONDS_LIMIT)
      .order("daily_seconds_earned_date", { ascending: false })
      .order("daily_seconds_earned", { ascending: false })
      .limit(48),
    supabase
      .from("public_artist_profiles")
      .select("user_id, artist_name, photo_url")
      .not("artist_name", "is", null)
      .limit(400),
  ]);

  const items: NewsFeedItem[] = [];
  const profileByUserId = new Map(
    (trackArtistsRes.data || [])
      .filter((p) => String(p?.user_id || "").trim() && String(p?.artist_name || "").trim())
      .map((p) => [String(p.user_id || ""), p])
  );

  (profilesRes.data || []).forEach((profile) => {
    const userId = String(profile?.user_id || "").trim();
    const name = String(profile?.artist_name || "").trim();
    const createdAtMs = new Date(profile?.created_at || 0).getTime() || 0;
    if (!userId || !name || !createdAtMs) return;
    if (nowMs - createdAtMs > NEWS_FEED_JOIN_WINDOW_MS) return;
    items.push({ type: "join", name, user_id: userId, photo_url: profile.photo_url || "", sortTime: createdAtMs });
  });

  (approvedTracksRes.data || []).forEach((track) => {
    const userId = String(track?.user_id || "").trim();
    const linkedProfile = profileByUserId.get(userId);
    const createdAtMs = new Date(track?.created_at || 0).getTime() || 0;
    const name = String(linkedProfile?.artist_name || track?.artist || "").trim();
    if (!userId || !linkedProfile || !name || !createdAtMs) return;
    if (nowMs - createdAtMs > NEWS_FEED_TRACK_WINDOW_MS) return;
    items.push({
      type: "approved_track",
      name,
      user_id: userId,
      track_title: track.title || "Untitled",
      photo_url: linkedProfile.photo_url || "",
      sortTime: createdAtMs,
    });
  });

  (supportersRes.data || []).forEach((profile) => {
    const userId = String(profile?.user_id || "").trim();
    const linkedProfile = profileByUserId.get(userId);
    const name = String(profile?.artist_name || linkedProfile?.artist_name || "").trim();
    const profileDate = normalizeSupabaseDate(profile?.daily_seconds_earned_date as string | undefined);
    const dailySeconds = Number(profile?.daily_seconds_earned || 0);
    if (!userId || !name) return;
    if (!isCurrentSupabaseDailyDate(profileDate) || dailySeconds < DAILY_SECONDS_LIMIT) return;
    items.push({
      type: "support_today",
      name,
      user_id: userId,
      photo_url: profile.photo_url || linkedProfile?.photo_url || "",
      sortTime: nowMs + dailySeconds,
    });
  });

  const deduped: NewsFeedItem[] = [];
  const seen = new Set<string>();
  items
    .sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0))
    .forEach((item) => {
      const key = `${item.type}:${item.user_id || ""}:${item.track_title || ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(item);
    });

  return deduped.slice(0, 18);
}

export type TopSupporter = {
  artist_name: string | null;
  user_id: string;
  photo_url: string | null;
  coins: number;
};

/** Ported from loadTopSupporters() in index.js */
export async function fetchTopSupporters(): Promise<TopSupporter[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("artist_name, user_id, photo_url, coins")
    .not("artist_name", "is", null)
    .gt("coins", 0)
    .order("coins", { ascending: false })
    .limit(10);

  if (error || !data?.length) return [];
  return data.filter((p) => String(p.artist_name || "").trim()) as TopSupporter[];
}
