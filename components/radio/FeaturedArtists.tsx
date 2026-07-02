"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  fetchFeaturedArtists,
  formatArtistRoles,
  getArtistNationalityLabel,
  type FeaturedArtist,
} from "@/lib/community";

const INTERVAL_MS = 10000;

function ArtistCardBody({ artist, small }: { artist: FeaturedArtist; small?: boolean }) {
  const initial = (artist.artist_name || "A").charAt(0).toUpperCase();
  const roles = formatArtistRoles(artist.music_roles);
  const nationality = getArtistNationalityLabel(artist.nationality);
  const showCity = artist.show_city_on_artist_page && artist.city;

  return (
    <>
      <div
        className={`fa-photo-wrap${!artist.photo_url ? " fa-no-photo" : ""}`}
        data-initials={!artist.photo_url ? initial : undefined}
      >
        {artist.photo_url && (
          <Image src={artist.photo_url} alt={artist.artist_name || "Artist"} fill className="fa-photo" />
        )}
      </div>
      <div className="fa-info">
        <div className="fa-name">{artist.artist_name || "Unknown Artist"}</div>
        {roles && <div className="fa-role">{roles}</div>}
        <div className="fa-meta">
          {nationality && <span className="fa-pill">{nationality}</span>}
          {showCity && <span className="fa-pill">{"\u{1F4CD}"} {artist.city}</span>}
        </div>
        {!small && artist.track_title && <div className="fa-tune">{"\u{1F3B5}"} {artist.track_title}</div>}
        {!small && artist.bio && <div className="fa-bio">{artist.bio}</div>}
        {small && artist.track_title && <div className="fa-tune">{"\u{1F3B5}"} {artist.track_title}</div>}
        <Link className="fa-link" href={`/artist?user_id=${encodeURIComponent(artist.user_id)}`}>
          View profile →
        </Link>
      </div>
    </>
  );
}

export default function FeaturedArtists() {
  const [artists, setArtists] = useState<FeaturedArtist[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const touchStartX = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFeaturedArtists()
      .then(setArtists)
      .catch((err) => console.error("[featured-artists] error:", err));
  }, []);

  // Ported from restartProgress() in featured-artists.js
  useEffect(() => {
    const el = progressRef.current;
    if (!el || !artists.length) return;
    el.style.transition = "none";
    el.style.width = "0%";
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        el.style.transition = `width ${INTERVAL_MS}ms linear`;
        el.style.width = "100%";
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [currentIndex, isPaused, artists.length]);

  const goTo = useCallback(
    (index: number, dir?: "next" | "prev") => {
      if (!artists.length) return;
      const normalized = ((index % artists.length) + artists.length) % artists.length;
      setDirection(dir || (index > currentIndex ? "next" : "prev"));
      setCurrentIndex(normalized);
    },
    [artists.length, currentIndex]
  );

  useEffect(() => {
    if (!artists.length || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCurrentIndex((idx) => {
        const next = (idx + 1) % artists.length;
        setDirection("next");
        return next;
      });
    }, INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [artists.length, isPaused]);

  const smallArtists = useMemo(() => {
    if (!artists.length) return [];
    return [1, 2].map((offset) => artists[(currentIndex + offset) % artists.length]);
  }, [artists, currentIndex]);

  const dotsCount = Math.min(artists.length, 10);

  if (!artists.length) return null;

  const activeArtist = artists[currentIndex];

  return (
    <section id="featuredArtistSection" className="fa-section">
      <div className="fa-kicker">Artist Spotlight</div>
      <div className="fa-grid">
        <div
          className="fa-card fa-card--large"
          id="featuredArtistCard"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(dx) > 50) goTo(currentIndex + (dx < 0 ? 1 : -1), dx < 0 ? "next" : "prev");
          }}
          style={
            activeArtist.photo_url
              ? ({ ["--fa-bg-image" as string]: `url("${activeArtist.photo_url.replace(/["\\]/g, "")}")` } as React.CSSProperties)
              : undefined
          }
        >
          <div className="fa-progress-bar">
            <div ref={progressRef} className="fa-progress-fill" id="featuredArtistProgress" />
          </div>
          <div className="fa-body" key={`${activeArtist.user_id}-${direction}`}>
            <ArtistCardBody artist={activeArtist} />
          </div>
          <div className="fa-divider" />
          <div className="fa-footer">
            <button className="fa-nav-btn" aria-label="Previous artist" onClick={() => goTo(currentIndex - 1, "prev")}>
              &#8249;
            </button>
            <div className="fa-dots">
              {Array.from({ length: dotsCount }).map((_, i) => (
                <button
                  key={i}
                  className={`fa-dot${i === currentIndex ? " active" : ""}`}
                  aria-label={`Artist ${i + 1}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
            <button className="fa-nav-btn" aria-label="Next artist" onClick={() => goTo(currentIndex + 1, "next")}>
              &#8250;
            </button>
          </div>
        </div>

        {smallArtists.map((artist, i) => (
          <div
            className="fa-card fa-card--small"
            key={artist.user_id}
            id={`featuredArtistCard${i + 1}`}
            style={
              artist.photo_url
                ? ({ ["--fa-bg-image" as string]: `url("${artist.photo_url.replace(/["\\]/g, "")}")` } as React.CSSProperties)
                : undefined
            }
          >
            <div className="fa-progress-bar">
              <div className="fa-progress-fill" />
            </div>
            <div className="fa-body">
              <ArtistCardBody artist={artist} small />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
