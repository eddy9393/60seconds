import { getSupabaseClient } from "./supabase";
import type { TrendPoint } from "@/components/statistics/TrendChart";

function normalizeUtcDateInput(value?: string | null): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function eachDateInclusive(startDate: string, endDate: string): string[] {
  const result: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

function buildSeriesMap(rows: Record<string, unknown>[], keyName: string, dateName = "stat_date"): Map<string, number> {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const date = normalizeUtcDateInput(row?.[dateName] as string | undefined);
    if (!date) return;
    const existing = Number(map.get(date) || 0);
    map.set(date, existing + (Number(row?.[keyName]) || 0));
  });
  return map;
}

function buildDailyCountMapFromRows(rows: Record<string, unknown>[], dateField = "created_at"): Map<string, number> {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const date = normalizeUtcDateInput(row?.[dateField] as string | undefined);
    if (!date) return;
    map.set(date, Number(map.get(date) || 0) + 1);
  });
  return map;
}

function buildSeriesFromRange(startDate: string | null, endDate: string, dailyMap: Map<string, number>): TrendPoint[] {
  if (!startDate || !endDate) return [];
  return eachDateInclusive(startDate, endDate).map((date) => ({ date, value: Number(dailyMap.get(date) || 0) }));
}

function getTodayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export type ChartDataByMetric = {
  streams: TrendPoint[];
  visits: TrendPoint[];
  likes: TrendPoint[];
};

export type TrendResult = {
  chartDataByMetric: ChartDataByMetric;
  firstAvailableByMetric: { streams: string | null; visits: string | null; likes: string | null };
  totalLikes: number;
  totalVisits: number;
};

/** Ported from loadTrendData() in statistics.js */
export async function loadTrendData(
  userId: string,
  track: { id?: string; created_at?: string } | null
): Promise<TrendResult> {
  const supabase = getSupabaseClient();
  const trackId = track?.id;
  const trackCreatedDate = normalizeUtcDateInput(track?.created_at) || getTodayUtcDate();
  const today = getTodayUtcDate();

  const { data: artistTracks } = await supabase.from("tracks").select("id").eq("user_id", userId);
  const artistTrackIds = Array.isArray(artistTracks) ? artistTracks.map((row) => row?.id).filter(Boolean) : [];

  const [trackDailyResult, profileDailyResult, likesResult, totalLikesCountResult] = await Promise.all([
    trackId
      ? supabase.from("track_daily_stats").select("stat_date, radio_streams, likes").eq("track_id", trackId).order("stat_date", { ascending: true })
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    supabase.from("profile_daily_stats").select("stat_date, profile_visits").eq("profile_user_id", userId).order("stat_date", { ascending: true }),
    trackId
      ? supabase.from("track_likes").select("created_at").eq("track_id", trackId).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    artistTrackIds.length
      ? supabase.from("track_likes").select("id", { count: "exact", head: true }).in("track_id", artistTrackIds)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const trackDailyRows = (trackDailyResult?.data || []) as Record<string, unknown>[];
  const profileDailyRows = (profileDailyResult?.data || []) as Record<string, unknown>[];
  const likeRows = (likesResult?.data || []) as Record<string, unknown>[];

  const streamMap = buildSeriesMap(trackDailyRows, "radio_streams");
  const visitMap = buildSeriesMap(profileDailyRows, "profile_visits");
  const likeMapFromDaily = buildSeriesMap(trackDailyRows, "likes");
  const likeMapFromEvents = buildDailyCountMapFromRows(likeRows, "created_at");
  const finalLikeMap = likeMapFromDaily.size ? likeMapFromDaily : likeMapFromEvents;

  const firstStreamDate = Array.from(streamMap.keys()).sort()[0] || null;
  const firstVisitDate = Array.from(visitMap.keys()).sort()[0] || null;
  const firstLikeDate = Array.from(finalLikeMap.keys()).sort()[0] || null;

  const chartDataByMetric: ChartDataByMetric = {
    streams: buildSeriesFromRange(firstStreamDate || trackCreatedDate, today, streamMap).filter((p) =>
      firstStreamDate ? p.date >= firstStreamDate : false
    ),
    visits: buildSeriesFromRange(firstVisitDate || trackCreatedDate, today, visitMap).filter((p) =>
      firstVisitDate ? p.date >= firstVisitDate : false
    ),
    likes: buildSeriesFromRange(firstLikeDate || trackCreatedDate, today, finalLikeMap).filter((p) =>
      firstLikeDate ? p.date >= firstLikeDate : false
    ),
  };

  let totalLikes = Array.from(finalLikeMap.values()).reduce((sum, v) => sum + Number(v || 0), 0);
  if (Number.isFinite(Number(totalLikesCountResult?.count))) {
    totalLikes = Number(totalLikesCountResult?.count) || 0;
  }
  if (!totalLikes && likeRows.length) totalLikes = likeRows.length;

  const totalVisits = Array.from(visitMap.values()).reduce((sum, v) => sum + Number(v || 0), 0);

  return {
    chartDataByMetric,
    firstAvailableByMetric: { streams: firstStreamDate, visits: firstVisitDate, likes: firstLikeDate },
    totalLikes,
    totalVisits,
  };
}

export function getDisplayRoles(profile: { music_roles?: string[] | null; music_role?: string | null } | null): string {
  const roles = Array.isArray(profile?.music_roles) ? profile!.music_roles!.filter(Boolean) : [];
  if (roles.length) return roles.join(" • ");
  if (String(profile?.music_role || "").trim()) return String(profile!.music_role).trim();
  return "Artist";
}

export function getDisplayLocation(profile: { city?: string | null; nationality?: string | null } | null): string {
  const city = String(profile?.city || "").trim();
  const country = String(profile?.nationality || "").trim();
  if (city && country) return `${city}, ${country}`;
  return city || country || "No location yet";
}
