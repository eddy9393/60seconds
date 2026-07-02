"use client";

import { useEffect, useRef, useState } from "react";
import { toggleTrackLikeInSupabase } from "@/lib/profile";
import { formatDate, formatPlayerTime, type ArtistTrack } from "@/lib/artist";
import { getSafeVolume, readLikedTrackIds, writeLikedTrackIds } from "@/lib/radio";
import { APP_CONFIG } from "@/lib/config";

type Props = {
  track: ArtistTrack;
  isOwnTrack: boolean;
  currentUserId: string | null;
  activeAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  onPlayStart: () => void;
};

export default function TrackPlayerCard({ track, isOwnTrack, currentUserId, activeAudioRef, onPlayStart }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const volumeAutoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [timeLabel, setTimeLabel] = useState("0:00");
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [volume, setVolume] = useState<number>(APP_CONFIG.defaultVolume);

  const createdAtLabel = formatDate(track.created_at);
  const previewStart = Math.max(0, Number(track.preview_start_seconds || 0));
  const previewDuration = Math.max(1, Math.min(60, Number(track.preview_duration_seconds || 60)));
  const allowFullTrack = Boolean(track.artist_page_full_track);
  const genrePills = [track.genre_primary, track.genre_secondary].filter(Boolean) as string[];
  const feelingTags = Array.isArray(track.feeling_tags) ? track.feeling_tags : [];

  useEffect(() => {
    setLiked(readLikedTrackIds().includes(String(track.id)));
    const storedVolume = typeof window !== "undefined" ? localStorage.getItem(APP_CONFIG.radioVolumeKey) : null;
    setVolume(getSafeVolume(storedVolume ?? APP_CONFIG.defaultVolume));
  }, [track.id]);

  useEffect(() => {
    const audio = new Audio(track.file_url);
    audio.preload = "metadata";
    audio.volume = volume;
    audioRef.current = audio;
    return () => {
      audio.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.file_url]);

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    audioRef.current?.pause();
    setIsPlaying(false);
    setProgressPct(0);
    setTimeLabel("0:00");
    if (activeAudioRef.current === audioRef.current) activeAudioRef.current = null;
  };

  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayToggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (activeAudioRef.current && activeAudioRef.current !== audio) {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      }

      if (!audio.paused && activeAudioRef.current === audio) {
        stop();
        return;
      }

      stop();
      onPlayStart();

      const playbackStart = allowFullTrack ? 0 : previewStart;
      audio.currentTime = playbackStart;
      await audio.play();
      activeAudioRef.current = audio;
      setIsPlaying(true);

      intervalRef.current = setInterval(() => {
        const elapsed = Math.max(0, audio.currentTime - playbackStart);
        const activeDuration = allowFullTrack ? Math.max(1, Math.floor(audio.duration || 0)) : previewDuration;
        setProgressPct(Math.min((elapsed / activeDuration) * 100, 100));
        setTimeLabel(formatPlayerTime(elapsed));

        if (!allowFullTrack && audio.currentTime >= previewStart + previewDuration) {
          stop();
        }
      }, 120);
    } catch (err) {
      console.error(err);
      stop();
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (activeAudioRef.current === audio) stop();
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLike = async () => {
    if (!currentUserId || isOwnTrack) return;
    setLikeBusy(true);
    try {
      const result = await toggleTrackLikeInSupabase({
        trackId: track.id,
        artistUserId: track.user_id,
        likerUserId: currentUserId,
      });
      if (result.error && !result.ownTrack) throw result.error;

      const likedIds = new Set(readLikedTrackIds());
      const key = String(track.id);
      if (result.liked) likedIds.add(key);
      else likedIds.delete(key);
      writeLikedTrackIds([...likedIds]);
      setLiked(result.liked);
    } catch (err) {
      console.error("artist like toggle error:", err);
    } finally {
      setLikeBusy(false);
    }
  };

  const handleVolumeChange = (value: number) => {
    const v = getSafeVolume(value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
    try {
      localStorage.setItem(APP_CONFIG.radioVolumeKey, String(v));
    } catch {
      // ignore
    }
    if (volumeAutoCloseTimer.current) clearTimeout(volumeAutoCloseTimer.current);
    volumeAutoCloseTimer.current = setTimeout(() => setVolumeOpen(false), 3000);
  };

  return (
    <article className="tune-card">
      <div className="tune-top">
        <div>
          <div className="tune-title">{track.title || "Untitled Track"}</div>
          <div className="tune-subtitle">{track.artist || "Artist"}</div>
        </div>
        <div className="tune-status">{allowFullTrack ? "Full track" : `${formatPlayerTime(previewDuration)} tune`}</div>
      </div>

      <div className="tune-player">
        <div className="player-row">
          <button className="player-btn" type="button" aria-label={isPlaying ? "Pause preview" : "Play preview"} onClick={handlePlayToggle}>
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <div className="progress-wrap">
            <div className="progress-bar" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="player-time">{timeLabel}</div>
        </div>

        <div className="tune-action-row">
          <button
            className={`tune-action-btn tune-like-btn${liked ? " is-liked" : ""}${isOwnTrack ? " is-disabled" : ""}`}
            type="button"
            disabled={!currentUserId || isOwnTrack || likeBusy}
            aria-label={isOwnTrack ? "You cannot like your own tune" : "Like this tune"}
            onClick={handleLike}
          >
            <span className="tune-action-icon">♥</span>
            <span>{isOwnTrack ? "Own tune" : liked ? "Liked" : "Like"}</span>
          </button>

          <div className={`tune-volume-shell${volumeOpen ? " is-open" : ""}`}>
            <button
              className="tune-action-btn tune-volume-btn"
              type="button"
              aria-label="Volume"
              onClick={(e) => {
                e.stopPropagation();
                setVolumeOpen((open) => {
                  const next = !open;
                  if (next) {
                    if (volumeAutoCloseTimer.current) clearTimeout(volumeAutoCloseTimer.current);
                    volumeAutoCloseTimer.current = setTimeout(() => setVolumeOpen(false), 3000);
                  }
                  return next;
                });
              }}
            >
              <span className="tune-action-icon">🔊</span>
              <span>Volume</span>
            </button>
            <div className="tune-volume-popout">
              <input
                className="tune-volume-range"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                aria-label="Tune volume"
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="tune-meta-row">
          <div className="mini-pill">
            {allowFullTrack
              ? "Playback: Full track"
              : `Preview: ${formatPlayerTime(previewStart)} - ${formatPlayerTime(previewStart + previewDuration)}`}
          </div>
          {createdAtLabel && <div className="mini-pill">Submitted: {createdAtLabel}</div>}
          {genrePills.map((genre) => (
            <div className="mini-pill" key={genre}>
              Genre: {genre}
            </div>
          ))}
          {feelingTags.map((tag) => (
            <div className="mini-pill" key={tag}>
              #{tag}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
