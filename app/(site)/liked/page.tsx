"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "../notifications/notifications.css";
import "./liked.css";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/lib/supabase";

type LikedTrack = {
  id: string;
  user_id: string | null;
  title: string | null;
  artist: string | null;
  genre_primary: string | null;
  genre_secondary: string | null;
};

export default function LikedPage() {
  const { user, loading } = useAuth();
  const [tracks, setTracks] = useState<LikedTrack[] | null>(null);

  useEffect(() => {
    if (loading || !user) return;

    let cancelled = false;
    (async () => {
      const supabase = getSupabaseClient();
      const { data: likeRows, error: likeRowsError } = await supabase
        .from("track_likes")
        .select("track_id, created_at")
        .eq("liker_user_id", user.id)
        .order("created_at", { ascending: false });

      const likedIds = Array.isArray(likeRows) ? likeRows.map((row) => String(row.track_id)).filter(Boolean) : [];

      if (likeRowsError || !likedIds.length) {
        if (!cancelled) setTracks([]);
        return;
      }

      const { data, error } = await supabase
        .from("tracks")
        .select("id, user_id, title, artist, genre_primary, genre_secondary, status")
        .in("id", likedIds);

      if (cancelled) return;

      if (error || !data?.length) {
        setTracks([]);
        return;
      }

      const ordered = likedIds
        .map((id) => data.find((row) => String(row.id) === String(id)))
        .filter(Boolean) as LikedTrack[];
      setTracks(ordered);
    })().catch((err) => {
      console.error("liked page error:", err);
      if (!cancelled) setTracks([]);
    });

    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  return (
    <main className="page-wrap liked-page">
      <div className="section-kicker">Liked Tunes</div>
      <h1 className="page-title">Library of Likes</h1>
      <p className="page-subtitle">A clean playlist-style view of the tunes you&rsquo;ve liked on 60 Seconds FM.</p>

      {!loading && !user && (
        <div className="empty-card">
          <div className="empty-icon">♥</div>
          <div className="empty-title">Log in to view your liked tunes</div>
          <div className="empty-text">Your likes are saved to your session on this device.</div>
          <Link href="/login" className="tune-action-btn">
            Login
          </Link>
        </div>
      )}

      {!loading && user && tracks && tracks.length === 0 && (
        <div className="empty-card">
          <div className="empty-icon">♪</div>
          <div className="empty-title">No liked tunes yet</div>
          <div className="empty-text">Start exploring the radio and save the tunes you want to come back to.</div>
          <Link href="/" className="back-link">
            ← Back to Radio
          </Link>
        </div>
      )}

      {!loading && user && tracks && tracks.length > 0 && (
        <section className="playlist-card">
          <div className="playlist-header">
            <div>#</div>
            <div>Title</div>
            <div>Artist</div>
            <div>Genres</div>
            <div>Action</div>
          </div>
          <div className="playlist-list">
            {tracks.map((track, index) => {
              const genres = [track.genre_primary, track.genre_secondary].filter(Boolean).join(" / ") || "—";
              return (
                <div className="playlist-row" key={track.id}>
                  <div className="playlist-index">{index + 1}</div>
                  <div>
                    <div className="playlist-title">{track.title || "Untitled tune"}</div>
                  </div>
                  <div>
                    <div className="playlist-title">{track.artist || "Artist"}</div>
                  </div>
                  <div>
                    <span className="playlist-pill">{genres}</span>
                  </div>
                  <div className="playlist-actions">
                    <Link className="playlist-open" href={`/artist?user_id=${encodeURIComponent(track.user_id || "")}`}>
                      Go To Artist
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
