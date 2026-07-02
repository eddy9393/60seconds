"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import "./artist.css";
import { useAuth } from "@/hooks/useAuth";
import { hasCompletedArtistProfile } from "@/lib/profile";
import { getFlagEmoji } from "@/lib/countries";
import {
  fetchArtistProfile,
  fetchApprovedTracks,
  recordProfileVisit,
  getMemberSinceDisplay,
  getBirthdayDisplay,
  type ArtistProfile,
  type ArtistTrack,
} from "@/lib/artist";
import TrackPlayerCard from "@/components/artist/TrackPlayerCard";

function ArtistPageContent() {
  const searchParams = useSearchParams();
  const urlUserId = searchParams.get("user_id");
  const { user, profile, track, loading } = useAuth();

  const [viewedProfile, setViewedProfile] = useState<ArtistProfile | null | undefined>(undefined);
  const [viewedTracks, setViewedTracks] = useState<ArtistTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // The user_id we actually resolve to: explicit ?user_id=, or — if none —
  // the logged-in user's own profile (mirrors refreshWholePage() in artist.js)
  const resolvedUserId = urlUserId || (!loading && user && hasCompletedArtistProfile(profile) ? user.id : null);
  const isOwnPage = Boolean(user && resolvedUserId && user.id === resolvedUserId);

  useEffect(() => {
    if (loading) return;

    if (!resolvedUserId) {
      setViewedProfile(user ? null : undefined);
      setTracksLoading(false);
      return;
    }

    let cancelled = false;
    setTracksLoading(true);
    setStatusError("");

    (async () => {
      let artistProfile: ArtistProfile | null;
      try {
        artistProfile = await fetchArtistProfile(resolvedUserId);
      } catch (err) {
        if (!cancelled) {
          setStatusError((err as Error).message || "Could not load artist profile.");
          setViewedProfile(null);
          setTracksLoading(false);
        }
        return;
      }

      if (cancelled) return;
      setViewedProfile(artistProfile);

      if (!artistProfile) {
        setTracksLoading(false);
        return;
      }

      if (user && user.id !== resolvedUserId) {
        recordProfileVisit(resolvedUserId, user.id).catch((err) => console.error(err));
      }

      try {
        const tracks = await fetchApprovedTracks(resolvedUserId);
        if (!cancelled) setViewedTracks(tracks);
      } catch (err) {
        if (!cancelled) setStatusError((err as Error).message || "Could not load approved track.");
      } finally {
        if (!cancelled) setTracksLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, resolvedUserId, user]);

  if (!loading && !urlUserId && !user) {
    // No user_id in the URL and not logged in — original shows a blank shell.
    return <main className="page-wrap" />;
  }

  if (viewedProfile === null && !tracksLoading) {
    return (
      <main className="page-wrap">
        <section className="artist-stage">
          <div className="artist-cta-shell">
            <div className="artist-cta-card">
              <div className="artist-cta-kicker">You&rsquo;re one step away</div>
              <h2 className="artist-cta-title">Create your artist profile</h2>
              <p className="artist-cta-copy">
                Unlock your artist page, submit your tune, and start sharing your sound with listeners on 60 Seconds FM.
              </p>
              <Link href="/join" className="gold-btn">
                Create artist profile
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const p = viewedProfile;
  const displayName = p?.artist_name || "Unknown Artist";
  const nationalityFlag = p?.nationality ? getFlagEmoji(p.nationality) || p.nationality : "";
  const roles = Array.isArray(p?.music_roles) && p.music_roles.length ? p.music_roles : p?.music_role ? [p.music_role] : [];
  const roleLabel = roles.length && !roles.includes("none") ? roles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(" · ") : "";
  const birthdayDisplay = getBirthdayDisplay(p?.date_of_birth);
  const hasMeta = Boolean(nationalityFlag || roleLabel || p?.city || true); // member-since pill always renders

  return (
    <main className="page-wrap">
      <section className="artist-stage">
        <div className="portrait-column">
          <div className="portrait-stage">
            {p?.photo_url ? (
              <Image id="artistPhoto" className="artist-photo" src={p.photo_url} alt="Artist photo" width={280} height={280} />
            ) : (
              <div id="artistPhotoFallback" className="artist-photo-fallback">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="info-column">
          <div className="section-kicker">Artist Page</div>
          <h1 className="artist-name">{p ? displayName : "Loading artist..."}</h1>

          {p && hasMeta && (
            <div className="artist-meta">
              {nationalityFlag && <div className="meta-pill">{nationalityFlag}</div>}
              {roleLabel && <div className="meta-pill">{roleLabel}</div>}
              {p.city && <div className="meta-pill">{p.city}</div>}
              <div className="meta-pill member-since-pill">Member since {getMemberSinceDisplay(p.created_at)}</div>
              {birthdayDisplay && (
                <div className="meta-pill birthday-pill">
                  <span className="birthday-icon" aria-hidden="true">
                    🎂
                  </span>
                  <span>{birthdayDisplay}</span>
                </div>
              )}
            </div>
          )}

          {p?.bio && <div className="artist-bio">{p.bio}</div>}

          <div className="hero-actions">
            {p?.social_link && (
              <a className="ghost-btn" href={p.social_link} target="_blank" rel="noopener noreferrer">
                Visit Social / Streaming
              </a>
            )}
            {isOwnPage && (
              <Link className="metal-btn" href="/edit-profile">
                Edit Profile
              </Link>
            )}
            {isOwnPage && (
              <Link className="metal-btn" href="/statistics">
                View Statistics
              </Link>
            )}
            {isOwnPage && (
              <Link className="gold-btn" href="/submit-track">
                {track ? "Edit Your Track" : "Submit Your Tune"}
              </Link>
            )}
          </div>

          <div className="section-divider" />

          <section className="submission-section">
            <div className="submission-header">
              <h2 className="submission-title">Tune</h2>
            </div>

            {statusError && <div className="status-box error">{statusError}</div>}

            {!tracksLoading && viewedTracks.length > 0 && (
              <div className="tracks-grid">
                {viewedTracks.map((t) => (
                  <TrackPlayerCard
                    key={t.id}
                    track={t}
                    isOwnTrack={Boolean(user?.id && String(user.id) === String(t.user_id))}
                    currentUserId={user?.id || null}
                    activeAudioRef={activeAudioRef}
                    onPlayStart={() => {
                      // Pause the main/mini radio player when a preview starts
                      try {
                        const raw = localStorage.getItem("ssfm_radio_session_v2");
                        const session = raw ? JSON.parse(raw) : {};
                        session.desiredPlaying = false;
                        session.isPlaying = false;
                        session.lastUpdatedAt = Date.now();
                        localStorage.setItem("ssfm_radio_session_v2", JSON.stringify(session));
                      } catch {
                        // ignore
                      }
                    }}
                  />
                ))}
              </div>
            )}

            {!tracksLoading && viewedTracks.length === 0 && !statusError && (
              <div className="empty-box">This artist has no approved tune available yet.</div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default function ArtistPage() {
  return (
    <Suspense fallback={<main className="page-wrap" />}>
      <ArtistPageContent />
    </Suspense>
  );
}
