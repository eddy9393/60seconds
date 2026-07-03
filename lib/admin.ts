import { getSupabaseClient } from "./supabase";

export type PendingTrack = {
  id: string;
  title: string | null;
  artist: string | null;
  file_url: string | null;
  created_at: string | null;
  status: string;
};

export type MetricsSnapshot = {
  uniqueVisitorsToday?: number;
  uniqueVisitors7d?: number;
  uniqueVisitors30d?: number;
  returningVisitors30d?: number;
  topPageToday?: string;
  pendingTracks?: number;
  approvedTracks?: number;
  liveProfiles?: number;
  profilesTotal?: number;
  totalPlatformLikes?: number;
};

/** Ported from checkAdminAccess() in admin.js */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("profiles").select("is_admin").eq("user_id", userId).single();
  if (error || !data?.is_admin) return false;
  return true;
}

/** Ported from loadPendingTracks() in admin.js */
export async function fetchPendingTracks(): Promise<PendingTrack[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tracks")
    .select("id, title, artist, file_url, created_at, status")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Could not load pending tracks: ${error.message}`);
  return data || [];
}

/** Ported from loadMetrics() in admin.js */
export async function fetchMetricsSnapshot(): Promise<MetricsSnapshot> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_traffic_snapshot");
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] || {} : data || {};
}

/** Ported from approveTrack() in admin.js */
export async function approveTrack(trackId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("tracks").update({ status: "approved" }).eq("id", trackId);
  if (error) throw new Error(`Approve failed: ${error.message}`);
}

export type MetricFilter = "traffic" | "content" | "platform";

/** Ported from getMetricRows() in admin.js */
export function getMetricRows(snapshot: MetricsSnapshot): Record<MetricFilter, { label: string; value: string | number; featured?: boolean }[]> {
  return {
    traffic: [
      { label: "Unique visitors today", value: snapshot.uniqueVisitorsToday ?? 0, featured: true },
      { label: "Unique visitors · 7 days", value: snapshot.uniqueVisitors7d ?? 0 },
      { label: "Unique visitors · 30 days", value: snapshot.uniqueVisitors30d ?? 0 },
      { label: "Returning visitors · 30 days", value: snapshot.returningVisitors30d ?? 0 },
      { label: "Top page today", value: snapshot.topPageToday || "—" },
    ],
    content: [
      { label: "Pending tracks", value: snapshot.pendingTracks ?? 0, featured: true },
      { label: "Approved tracks", value: snapshot.approvedTracks ?? 0 },
      { label: "Live artist profiles", value: snapshot.liveProfiles ?? 0 },
      { label: "Profiles on the platform", value: snapshot.profilesTotal ?? 0 },
    ],
    platform: [
      { label: "Total platform likes", value: snapshot.totalPlatformLikes ?? 0, featured: true },
      { label: "Profiles on the platform", value: snapshot.profilesTotal ?? 0 },
      { label: "Live artist profiles", value: snapshot.liveProfiles ?? 0 },
      { label: "Approved tracks", value: snapshot.approvedTracks ?? 0 },
    ],
  };
}
