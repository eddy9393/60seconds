"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRadio } from "@/hooks/useRadioEngine";

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mini-svg-icon">
      <path
        d="M12 20.5 4.7 13.9a4.8 4.8 0 0 1-.4-6.8A4.7 4.7 0 0 1 11 7.3l1 1 1-1a4.7 4.7 0 0 1 6.7-.2 4.8 4.8 0 0 1-.4 6.8L12 20.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mini-svg-icon">
      <path d="M8 6.5v11l9-5.5-9-5.5Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mini-svg-icon">
      <rect x="7" y="6.5" width="3.5" height="11" rx="1.2" fill="currentColor" />
      <rect x="13.5" y="6.5" width="3.5" height="11" rx="1.2" fill="currentColor" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mini-svg-icon">
      <path d="M4 10h4l5-4v12l-5-4H4z" fill="currentColor" />
      <path d="M16 9.2a3.3 3.3 0 0 1 0 5.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M18.7 6.8a6.3 6.3 0 0 1 0 10.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export default function MiniPlayer() {
  const pathname = usePathname();
  const {
    miniTimeRef,
    isLive,
    title,
    artistName,
    isPlaying,
    liked,
    likeBusy,
    isOwnTrack,
    isLoggedIn,
    muted,
    volume,
    volumeOpen,
    handlePauseToggle,
    handleLike,
    handleVolumeChange,
    toggleVolumeControl,
  } = useRadio();

  const visible = isLive && pathname !== "/";

  useEffect(() => {
    document.body.classList.toggle("has-mini-radio-player", visible);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={`mini-radio-player${volumeOpen ? " volume-open" : ""}`}>
      <div className="mini-radio-top">
        <div id="miniRadioArtist" className="mini-radio-artist">
          {artistName || "—"}
        </div>
        <div id="miniRadioTitle" className="mini-radio-title">
          {title || "—"}
        </div>
      </div>
      <div className="mini-radio-controls">
        <button
          id="miniRadioLike"
          className={`mini-radio-btn${liked ? " is-liked" : ""}${isOwnTrack ? " is-disabled" : ""}`}
          type="button"
          disabled={!isLoggedIn || isOwnTrack || likeBusy}
          onClick={handleLike}
        >
          <span className="mini-player-icon">
            <HeartIcon />
          </span>
          <span>{isOwnTrack ? "Own tune" : liked ? "Liked" : "Like"}</span>
        </button>

        <button id="miniRadioPause" className="mini-radio-btn" type="button" onClick={handlePauseToggle}>
          <span className="mini-player-icon">{isPlaying ? <PauseIcon /> : <PlayIcon />}</span>
          <span>{isPlaying ? "Pause" : "Play"}</span>
        </button>

        <div className="mini-radio-volume-wrap">
          <span
            className="mini-radio-volume-icon"
            aria-hidden="true"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleVolumeControl();
            }}
          >
            <VolumeIcon />
          </span>
          <input
            id="miniRadioVolume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            aria-label="Volume"
            onFocus={toggleVolumeControl}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
          />
        </div>

        <div id="miniRadioTime" ref={miniTimeRef} className="mini-radio-time">
          0:00 / 1:00
        </div>
      </div>
      {muted && <span className="hidden">muted</span>}
    </div>
  );
}
