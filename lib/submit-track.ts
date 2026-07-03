import { getSupabaseClient } from "./supabase";

export const GENRE_OPTIONS = [
  "Afrobeats", "Alternative", "Ambient", "Amapiano", "Classical", "Country",
  "Dance", "Dancehall", "Deep House", "Disco", "Drill", "Drum & Bass",
  "Dubstep", "EDM", "Electronic", "Folk", "Funk", "Garage", "Gospel",
  "Grime", "Hardstyle", "Hip Hop", "House", "Indie", "Jazz", "Latin",
  "Lo-fi", "Pop", "R&B", "Rap", "Reggae", "Reggaeton", "Rock", "Soul",
  "Tech House", "Techno", "Trap", "Trance", "UK Garage", "Other",
];

export const FEELING_OPTIONS = [
  "Energetic", "Emotional", "Melancholic", "Uplifting", "Dark",
  "Dreamy", "Romantic", "Aggressive", "Hypnotic", "Chill",
  "Party", "Nostalgic", "Sexy", "Epic", "Moody",
  "Spiritual", "Happy", "Sad", "Raw", "Late Night",
];

export type MyTrack = {
  id?: string;
  user_id?: string;
  title?: string | null;
  artist?: string | null;
  file_url?: string | null;
  status?: string;
  created_at?: string;
  genre_primary?: string | null;
  genre_secondary?: string | null;
  feeling_tags?: string[] | null;
  ai_usage?: string | null;
  ai_details?: string | null;
  rights_confirmed?: boolean | null;
  preview_start_seconds?: number | null;
  preview_duration_seconds?: number | null;
  artist_page_full_track?: boolean | null;
};

/** Ported from uploadTrackIfNeeded() in submit-track.js */
export async function uploadTrackFile(userId: string, file: File | null, existingUrl: string | null): Promise<string> {
  if (!file) return existingUrl || "";

  const supabase = getSupabaseClient();
  const cleanName = file.name.replace(/\s+/g, "-");
  const filePath = `${userId}/${Date.now()}-${cleanName}`;

  const { error } = await supabase.storage.from("tracks").upload(filePath, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(`Track upload failed: ${error.message}`);

  const { data } = supabase.storage.from("tracks").getPublicUrl(filePath);
  return data.publicUrl;
}

type SaveTrackArgs = {
  userId: string;
  artistName: string | null;
  existingTrack: MyTrack | null;
  fileUrl: string;
  title: string;
  genrePrimary: string;
  genreSecondary: string;
  feelingTags: string[];
  aiUsage: string;
  aiDetails: string;
  rightsConfirmed: boolean;
  artistPageFullTrack: boolean;
  previewStartSeconds: number;
  previewDurationSeconds: number;
  isNewFile: boolean;
};

/** Ported from the payload + insert/update branch of handleSaveTrack() in submit-track.js */
export async function saveTrack(args: SaveTrackArgs): Promise<void> {
  const supabase = getSupabaseClient();
  const nextStatus = args.existingTrack
    ? args.isNewFile
      ? "pending"
      : args.existingTrack.status || "pending"
    : "pending";

  const payload = {
    title: args.title,
    artist: args.artistName || null,
    file_url: args.fileUrl,
    user_id: args.userId,
    status: nextStatus,
    genre_primary: args.genrePrimary,
    genre_secondary: args.genreSecondary || null,
    feeling_tags: args.feelingTags.length ? args.feelingTags : [],
    ai_usage: args.aiUsage,
    ai_details: args.aiUsage === "partial" ? args.aiDetails || null : null,
    rights_confirmed: args.rightsConfirmed,
    preview_start_seconds: args.previewStartSeconds,
    preview_duration_seconds: args.previewDurationSeconds,
    artist_page_full_track: args.artistPageFullTrack,
  };

  if (args.existingTrack?.id) {
    const { error } = await supabase.from("tracks").update(payload).eq("id", args.existingTrack.id);
    if (error) throw new Error(`Saving track failed: ${error.message}`);
    return;
  }

  const { error } = await supabase.from("tracks").insert([payload]);
  if (error) throw new Error(`Saving track failed: ${error.message}`);
}

export function formatClipTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
