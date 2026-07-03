import { getSupabaseClient } from "./supabase";

export type NotificationRow = {
  id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  reward_seconds: number | null;
  related_track_id: string | null;
  related_user_id: string | null;
  created_at: string;
  is_read: boolean;
};

export type EnrichedNotification = NotificationRow & {
  _groupIds: string[];
  relatedProfile: { user_id: string; artist_name: string | null; photo_url: string | null } | null;
  relatedTrack: { id: string; title: string | null } | null;
};

/** Ported from getNotificationGroupIds() in notifications.js */
export function getNotificationGroupIds(item: Pick<EnrichedNotification, "_groupIds" | "id">): string[] {
  const ids = Array.isArray(item?._groupIds) ? item._groupIds.filter(Boolean) : [];
  return ids.length ? ids : [item?.id].filter(Boolean);
}

/** Ported from dedupeNotifications() in notifications.js — groups repeated
 * "tune_liked" events into a single card. */
function dedupeNotifications(items: NotificationRow[]): (NotificationRow & { _groupIds: string[] })[] {
  const map = new Map<string, NotificationRow & { _groupIds: string[] }>();
  items.forEach((item) => {
    if (!item) return;
    const isLike = String(item.type || "").trim() === "tune_liked";
    const key = isLike
      ? `tune_liked:${String(item.related_track_id || "")}:${String(item.related_user_id || "")}`
      : `id:${String(item.id || "")}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...item, _groupIds: [item.id].filter(Boolean) });
      return;
    }

    const existingTime = new Date(existing.created_at || 0).getTime() || 0;
    const nextTime = new Date(item.created_at || 0).getTime() || 0;
    const unread = existing.is_read === false || item.is_read === false;
    const mergedIds = [...new Set([...(existing._groupIds || []), item.id].filter(Boolean))];
    const preferred = nextTime >= existingTime ? { ...existing, ...item } : { ...item, ...existing };
    map.set(key, { ...preferred, is_read: !unread, _groupIds: mergedIds });
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
}

/** Ported from enrichNotifications() in notifications.js */
async function enrichNotifications(
  items: (NotificationRow & { _groupIds: string[] })[]
): Promise<EnrichedNotification[]> {
  const supabase = getSupabaseClient();
  const userIds = [...new Set(items.map((item) => String(item.related_user_id || "").trim()).filter(Boolean))];
  const trackIds = [...new Set(items.map((item) => String(item.related_track_id || "").trim()).filter(Boolean))];

  const profilesByUserId = new Map<string, { user_id: string; artist_name: string | null; photo_url: string | null }>();
  const tracksById = new Map<string, { id: string; title: string | null }>();

  if (userIds.length) {
    const { data, error } = await supabase.from("profiles").select("user_id, artist_name, photo_url").in("user_id", userIds);
    if (!error && data) data.forEach((row) => profilesByUserId.set(String(row.user_id), row));
  }
  if (trackIds.length) {
    const { data, error } = await supabase.from("tracks").select("id, title").in("id", trackIds);
    if (!error && data) data.forEach((row) => tracksById.set(String(row.id), row));
  }

  return items.map((item) => {
    const relatedUserId = String(item.related_user_id || "").trim();
    const relatedTrackId = String(item.related_track_id || "").trim();
    return {
      ...item,
      relatedProfile: relatedUserId ? profilesByUserId.get(relatedUserId) || null : null,
      relatedTrack: relatedTrackId ? tracksById.get(relatedTrackId) || null : null,
    };
  });
}

/** Ported from fetchNotifications() in notifications.js */
export async function fetchNotifications(userId: string): Promise<EnrichedNotification[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_notifications")
    .select("id, type, title, body, reward_seconds, related_track_id, related_user_id, created_at, is_read")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  const deduped = dedupeNotifications(Array.isArray(data) ? (data as NotificationRow[]) : []);
  return enrichNotifications(deduped);
}

/** Ported from acknowledgeNotifications() in notifications.js */
export async function acknowledgeNotifications(notifications: EnrichedNotification[], userId: string): Promise<boolean> {
  const unreadIds = notifications
    .filter((item) => item && item.is_read === false)
    .flatMap((item) => getNotificationGroupIds(item))
    .filter(Boolean);

  if (!unreadIds.length) return true;

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("user_notifications").update({ is_read: true }).in("id", unreadIds).eq("user_id", userId);
  if (error) throw error;
  return true;
}

/** Ported from deleteNotification() in notifications.js */
export async function deleteNotificationGroup(groupIdsCsv: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("user_notifications").delete().eq("id", groupIdsCsv).eq("user_id", userId);
  if (error) throw error;
}

export function getNotificationEmoji(type?: string | null): string {
  switch (String(type || "").trim()) {
    case "welcome_bonus":
      return "🎉";
    case "tune_uploaded":
      return "📤";
    case "tune_approved":
      return "✅";
    case "tune_liked":
      return "❤️";
    default:
      return "🔔";
  }
}

export function getNotificationTitle(item: EnrichedNotification): string {
  if (String(item?.type || "").trim() === "tune_liked") return "Your Tune got a new like";
  return String(item?.title || "Notification");
}

export function formatNotificationDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
