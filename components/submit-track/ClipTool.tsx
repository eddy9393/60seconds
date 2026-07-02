"use client";

import { useEffect, useRef, useState } from "react";
import { formatClipTime } from "@/lib/submit-track";

type Props = {
  sourceUrl: string | null;
  initialStart: number;
  onMetadata: (duration: number, start: number) => void;
  onStartChange: (start: number) => void;
};

export default function ClipTool({ sourceUrl, initialStart, onMetadata, onStartChange }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [currentTimeLabel, setCurrentTimeLabel] = useState("0:00");

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    audioRef.current?.pause();
    setIsPlaying(false);
    setProgressPct(0);
    setCurrentTimeLabel("0:00");
  };

  useEffect(() => {
    stop();
    setErrorMsg("");
    setDuration(0);

    const audio = audioRef.current;
    if (!audio || !sourceUrl) return;

    setStart(Math.max(0, Number(initialStart) || 0));
    audio.src = sourceUrl;
    audio.load();

    audio.onloadedmetadata = () => {
      const trackDuration = Number.isFinite(audio.duration) ? Math.floor(audio.duration) : 0;
      if (!trackDuration || trackDuration <= 0) {
        setErrorMsg("This track could not be analysed for preview selection.");
        return;
      }
      setDuration(trackDuration);
      const effectiveDuration = Math.min(60, trackDuration);
      const maxStart = Math.max(0, trackDuration - effectiveDuration);
      setStart((current) => {
        const clamped = Math.min(current, maxStart);
        onMetadata(trackDuration, clamped);
        return clamped;
      });
    };

    audio.onerror = () => {
      setErrorMsg("The preview tool could not load this track.");
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl]);

  const effectiveDuration = Math.min(60, Math.max(1, duration || 0));
  const maxStart = Math.max(0, duration - effectiveDuration);
  const end = Math.min(start + effectiveDuration, duration || 0);
  const widthPct = duration > 0 ? Math.max((effectiveDuration / duration) * 100, 8) : 100;
  const leftPct = duration > 0 ? (start / duration) * 100 : 0;

  const handleSliderChange = (value: number) => {
    stop();
    setStart(value);
    onStartChange(value);
  };

  const handlePlayToggle = async () => {
    const audio = audioRef.current;
    if (!audio?.src || !duration) return;

    if (!audio.paused) {
      stop();
      return;
    }

    try {
      const playStart = Math.max(0, Math.floor(start));
      const playEnd = Math.min(playStart + effectiveDuration, duration);
      audio.currentTime = playStart;
      await audio.play();
      setIsPlaying(true);

      intervalRef.current = setInterval(() => {
        const elapsed = Math.max(0, audio.currentTime - playStart);
        const total = Math.max(1, playEnd - playStart);
        setProgressPct(Math.min((elapsed / total) * 100, 100));
        setCurrentTimeLabel(formatClipTime(elapsed));
        if (audio.currentTime >= playEnd) stop();
      }, 120);
    } catch (err) {
      console.error(err);
      setErrorMsg("The preview clip could not be played.");
      stop();
    }
  };

  return (
    <>
      <audio ref={audioRef} id="previewAudio" preload="metadata" className="hidden" onEnded={stop} />

      {!sourceUrl || errorMsg || !duration ? (
        <div id="clipToolPlaceholder" className="field-help">
          {errorMsg || "Upload or load a tune first to choose your 60 second radio preview."}
        </div>
      ) : (
        <div id="clipTool" className="clip-tool">
          <div className="clip-tool-top">
            <div className="clip-badge-row">
              <div className="clip-badge">
                Preview start: <strong style={{ marginLeft: 6 }}>{formatClipTime(start)}</strong>
              </div>
              <div className="clip-badge">
                Preview end: <strong style={{ marginLeft: 6 }}>{formatClipTime(end)}</strong>
              </div>
              <div className="clip-badge">
                Length: <strong style={{ marginLeft: 6 }}>{effectiveDuration} sec</strong>
              </div>
            </div>
          </div>

          <div className="clip-wave">
            <div id="clipSelection" className="clip-selection" style={{ width: `${widthPct}%`, left: `${leftPct}%` }} />
          </div>

          <div className="clip-slider-row">
            <input
              id="clipStartSlider"
              className="clip-slider"
              type="range"
              min={0}
              max={maxStart}
              step={1}
              value={start}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
            />
            <div className="clip-meta">
              <span>Move the selector to choose where the 60 second preview starts.</span>
              <span id="fullTrackDurationLabel">Full tune: {formatClipTime(duration)}</span>
            </div>
          </div>

          <div className="clip-controls">
            <button id="clipPlayBtn" className="clip-play-btn" type="button" onClick={handlePlayToggle}>
              {isPlaying ? "Stop Preview" : "Play Selected 60 sec"}
            </button>
            <div className="clip-progress">
              <div id="clipProgressFill" className="clip-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div id="clipCurrentTime" className="clip-current-time">
              {currentTimeLabel}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
