import { APP_CONFIG } from "./config";

export type Track = {
  id: string;
  title: string | null;
  artist: string | null;
  file_url: string;
  user_id: string | null;
  play_count: number;
  preview_start_seconds: number | null;
  preview_duration_seconds: number | null;
  genre_primary: string | null;
  genre_secondary: string | null;
  nationality: string | null;
  photo_url?: string | null;
};

export type RadioSession = {
  startedDate?: string;
  isStarted?: boolean;
  isPlaying?: boolean;
  desiredPlaying?: boolean;
  currentTrack?: Track | null;
  currentTrackId?: string | null;
  currentIndex?: number;
  previewOffset?: number;
  volume?: number;
  muted?: boolean;
  lastUpdatedAt?: number;
  lastPath?: string;
};

export function formatNumber(value: number | null | undefined): string {
  return Number(value || 0).toLocaleString();
}

/** Ported from formatTime() in index.js */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

export function getTrackGenreLabel(track?: Track | null): string {
  const primary = String(track?.genre_primary || "").trim();
  const secondary = String(track?.genre_secondary || "").trim();
  return primary || secondary || "";
}

export function getTrackPreviewStart(track?: Track | null): number {
  const value = Number(track?.preview_start_seconds);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function getTrackPreviewDuration(track?: Track | null): number {
  const value = Number(track?.preview_duration_seconds);
  return Number.isFinite(value) && value > 0 ? value : 60;
}

export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDateKeyOffset(baseDateKey: string, offsetDays: number): string {
  const [year, month, day] = String(baseDateKey || "")
    .split("-")
    .map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + offsetDays);
  const outYear = date.getFullYear();
  const outMonth = String(date.getMonth() + 1).padStart(2, "0");
  const outDay = String(date.getDate()).padStart(2, "0");
  return `${outYear}-${outMonth}-${outDay}`;
}

export function normalizeSupabaseDate(value?: string | null): string {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export function isCurrentSupabaseDailyDate(profileDate?: string | null): boolean {
  const normalizedDate = normalizeSupabaseDate(profileDate);
  if (!normalizedDate) return false;
  const localToday = getTodayDateKey();
  return (
    normalizedDate === localToday ||
    normalizedDate === getDateKeyOffset(localToday, -1) ||
    normalizedDate === getDateKeyOffset(localToday, 1)
  );
}

export function getSafeVolume(candidate: unknown): number {
  const value = Number(candidate);
  if (!Number.isFinite(value)) return APP_CONFIG.defaultVolume;
  return Math.max(0, Math.min(1, value));
}

export function getSavedRadioSession(): RadioSession {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(APP_CONFIG.radioSessionKey) || "{}");
  } catch {
    return {};
  }
}

export function saveRadioSession(patch: Partial<RadioSession> = {}): RadioSession {
  const next: RadioSession = {
    ...getSavedRadioSession(),
    ...patch,
    lastUpdatedAt: Date.now(),
    lastPath: typeof window !== "undefined" ? window.location.pathname : "/",
  };
  try {
    localStorage.setItem(APP_CONFIG.radioSessionKey, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function getDesiredSessionPlayback(session: RadioSession = getSavedRadioSession()): boolean {
  if (!session?.isStarted || session?.startedDate !== getTodayDateKey()) return false;
  if (typeof session.desiredPlaying === "boolean") return session.desiredPlaying;
  return session.isPlaying !== false;
}

export function readLikedTrackIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(APP_CONFIG.radioLikeKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function writeLikedTrackIds(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(APP_CONFIG.radioLikeKey, JSON.stringify(Array.from(new Set((ids || []).map(String)))));
}

/** Ported from broadcastCurrencyUpdate() in index.js — keeps SiteChrome's
 * coins badge (via useAuth) in sync without a full profile refetch. */
export function broadcastCurrencyUpdate(coins: number, dailySecondsEarned: number) {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      coins: Number(coins) || 0,
      daily_seconds_earned: Number(dailySecondsEarned) || 0,
      updatedAt: Date.now(),
    };
    localStorage.setItem(APP_CONFIG.profileRuntimeStateKey, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("ssfm:coins-updated", { detail: payload }));
  } catch (err) {
    console.error("broadcastCurrencyUpdate error:", err);
  }
}
