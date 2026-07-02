"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./submit-track.css";
import { useAuth } from "@/hooks/useAuth";
import { hasCompletedArtistProfile } from "@/lib/profile";
import { GENRE_OPTIONS, FEELING_OPTIONS, uploadTrackFile, saveTrack, type MyTrack } from "@/lib/submit-track";
import ClipTool from "@/components/submit-track/ClipTool";

type AiUsage = "" | "none" | "partial" | "full";

export default function SubmitTrackPage() {
  const router = useRouter();
  const { user, profile, track, loading, refreshProfile } = useAuth();

  const t = track as MyTrack | null;
  const hasProfile = hasCompletedArtistProfile(profile);

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [genrePrimary, setGenrePrimary] = useState("");
  const [genreSecondary, setGenreSecondary] = useState("");
  const [feelings, setFeelings] = useState<string[]>([]);
  const [feelingsOpen, setFeelingsOpen] = useState(false);
  const [aiUsage, setAiUsage] = useState<AiUsage>("");
  const [aiDetails, setAiDetails] = useState("");
  const [artistPageFullTrack, setArtistPageFullTrack] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [status, setStatus] = useState<{ message: string; isError: boolean }>({ message: "", isError: false });
  const [busy, setBusy] = useState(false);

  const [previewSourceUrl, setPreviewSourceUrl] = useState<string | null>(null);
  const [previewStart, setPreviewStart] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const objectUrlRef = useRef<string | null>(null);
  const feelingsRef = useRef<HTMLDivElement>(null);

  const isEdit = Boolean(t);

  useEffect(() => {
    if (!t) return;
    setTitle(t.title || "");
    setGenrePrimary(t.genre_primary || "");
    setGenreSecondary(t.genre_secondary || "");
    setFeelings(Array.isArray(t.feeling_tags) ? t.feeling_tags : []);
    setAiUsage((t.ai_usage as AiUsage) || "");
    setAiDetails(t.ai_details || "");
    setRightsConfirmed(Boolean(t.rights_confirmed));
    setArtistPageFullTrack(Boolean(t.artist_page_full_track));
    if (t.file_url) {
      setPreviewSourceUrl(t.file_url);
      setPreviewStart(Number(t.preview_start_seconds || 0));
    }
  }, [t]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!feelingsRef.current?.contains(e.target as Node)) setFeelingsOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const handleFileChange = (nextFile: File | null) => {
    setFile(nextFile);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!nextFile) {
      if (t?.file_url) {
        setPreviewSourceUrl(t.file_url);
        setPreviewStart(Number(t.preview_start_seconds || 0));
      } else {
        setPreviewSourceUrl(null);
      }
      return;
    }

    const url = URL.createObjectURL(nextFile);
    objectUrlRef.current = url;
    setPreviewSourceUrl(url);
    setPreviewStart(0);
  };

  const toggleFeeling = (feeling: string) => {
    setFeelings((current) => {
      if (current.includes(feeling)) return current.filter((f) => f !== feeling);
      if (current.length >= 2) return current;
      return [...current, feeling];
    });
  };

  const handleSave = async () => {
    if (!user) {
      setStatus({ message: "You must be logged in before submitting a tune.", isError: true });
      return;
    }
    if (!hasProfile) {
      setStatus({ message: "You need to create your artist profile first.", isError: true });
      return;
    }
    if (!title.trim()) {
      setStatus({ message: "Please enter your tune title.", isError: true });
      return;
    }
    if (!genrePrimary) {
      setStatus({ message: "Please select a primary genre.", isError: true });
      return;
    }
    if (genreSecondary && genreSecondary === genrePrimary) {
      setStatus({ message: "Secondary genre must be different from the primary genre.", isError: true });
      return;
    }
    if (feelings.length > 2) {
      setStatus({ message: "You can select a maximum of 2 feeling tags.", isError: true });
      return;
    }
    if (!aiUsage) {
      setStatus({ message: "Please select how AI was used for this track.", isError: true });
      return;
    }
    if (!rightsConfirmed) {
      setStatus({ message: "You need to confirm the rights declaration before submitting.", isError: true });
      return;
    }
    if (!t && !file) {
      setStatus({ message: "Please upload your track file.", isError: true });
      return;
    }
    if (!previewSourceUrl) {
      setStatus({ message: "Please load a track and choose your 60 second radio preview.", isError: true });
      return;
    }
    if (!previewDuration || previewDuration <= 0) {
      setStatus({ message: "The preview tool could not read the track duration.", isError: true });
      return;
    }

    setBusy(true);
    setStatus({ message: "Uploading and saving tune...", isError: false });

    try {
      const fileUrl = await uploadTrackFile(user.id, file, t?.file_url || null);
      if (!fileUrl) {
        setStatus({ message: "No valid track file could be saved.", isError: true });
        return;
      }

      const effectivePreviewDuration = Math.min(60, Math.max(1, Math.floor(previewDuration)));
      const safePreviewStart = Math.max(0, Math.floor(previewStart));
      const isNewFile = Boolean(file);

      await saveTrack({
        userId: user.id,
        artistName: (profile as { artist_name?: string } | null)?.artist_name || null,
        existingTrack: t,
        fileUrl,
        title: title.trim(),
        genrePrimary,
        genreSecondary,
        feelingTags: feelings,
        aiUsage,
        aiDetails: aiDetails.trim(),
        rightsConfirmed,
        artistPageFullTrack,
        previewStartSeconds: safePreviewStart,
        previewDurationSeconds: effectivePreviewDuration,
        isNewFile,
      });

      setStatus({
        message: isNewFile
          ? "Track updated successfully. Because you uploaded a new file, it is now pending admin approval again."
          : "Track saved successfully.",
        isError: false,
      });

      await refreshProfile();
      setTimeout(() => router.push(`/artist?user_id=${encodeURIComponent(user.id)}`), 500);
    } catch (err) {
      console.error(err);
      setStatus({ message: (err as Error).message || "Something went wrong while saving your track.", isError: true });
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = (() => {
    if (!t) return null;
    if (t.status === "pending")
      return {
        title: "⏳ Your tune is under review",
        cls: "pending",
        copy: "Your submission is waiting for admin approval. If you upload a new file later, it will go back into review before it can go live again.",
      };
    if (t.status === "approved")
      return {
        title: "✅ Your tune is live",
        cls: "approved",
        copy: "Your track is approved and can play on the radio. If you upload a new file later, it will require a new admin approval before going live again.",
      };
    if (t.status === "rejected")
      return {
        title: "❌ Your tune was not approved",
        cls: "rejected",
        copy: "You can update your submission and try again. Uploading a new file will send it back for review.",
      };
    return { title: "Tune status", cls: "", copy: "Your tune is saved." };
  })();

  return (
    <main className="page-wrap">
      <section className="hero-card">
        <div className="section-kicker">Tune Submission</div>
        <h1 className="page-title">{!hasProfile && user ? "Create Your Artist Profile" : "Enter The Radio"}</h1>
        <p className="page-note">
          {!hasProfile && user
            ? "You're one step away — create your artist profile first to unlock your artist page, submit your tune, and share your sound on 60 Seconds FM."
            : isEdit
              ? "This is your minute of fame, let's make it memorable!"
              : "Submit your 60 second preview and join the next wave."}
        </p>
      </section>

      <section className="panel-card">
        {!loading && !user && (
          <div className="notice-box cta-empty-state">
            <div className="cta-empty-state-kicker">You&rsquo;re one step away</div>
            <h2 className="cta-empty-state-title">Log in first</h2>
            <p className="cta-empty-state-copy">Log in to submit your tune to the radio.</p>
            <div className="cta-empty-state-actions">
              <Link className="gold-btn" href="/login">
                Login
              </Link>
            </div>
          </div>
        )}

        {!loading && user && !hasProfile && (
          <div className="notice-box cta-empty-state">
            <div className="cta-empty-state-kicker">You&rsquo;re one step away</div>
            <h2 className="cta-empty-state-title">Create your artist profile</h2>
            <p className="cta-empty-state-copy">
              Create your profile before you submit a tune. Unlock your artist page, publish your tune, and share your music with listeners.
            </p>
            <div className="cta-empty-state-actions">
              <Link className="gold-btn" href="/join">
                Create artist profile
              </Link>
            </div>
          </div>
        )}

        {statusLabel && (
          <div className="notice-box tune-status-box">
            <div className={`track-status-title ${statusLabel.cls}`}>{statusLabel.title}</div>
            <div className="track-status-copy">{statusLabel.copy}</div>
          </div>
        )}

        {!loading && user && hasProfile && (
          <div className="form-grid">
            <div className="field-group">
              <label className="field-label" htmlFor="trackTitle">
                Tune Title
              </label>
              <input
                id="trackTitle"
                className="field-input"
                type="text"
                placeholder="Enter your tune title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="trackFile">
                Tune File
              </label>
              <input
                id="trackFile"
                className="field-file"
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
              <div className="field-help">
                Upload the full tune file. On edit, you can leave this empty to keep your current uploaded file.
              </div>
              <div className="subtle-note">
                If you upload a new audio file, your tune will go back into review and must be approved again before it can go live on the radio.
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="genrePrimary">
                Primary Genre
              </label>
              <select id="genrePrimary" className="field-select" value={genrePrimary} onChange={(e) => setGenrePrimary(e.target.value)}>
                <option value="">Select primary genre</option>
                {GENRE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="genreSecondary">
                Secondary Genre (Optional)
              </label>
              <select id="genreSecondary" className="field-select" value={genreSecondary} onChange={(e) => setGenreSecondary(e.target.value)}>
                <option value="">Select secondary genre</option>
                {GENRE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">Music Feelings (Optional, max 2)</label>
              <div id="feelingsDropdown" className="feelings-dropdown" ref={feelingsRef}>
                <button
                  id="feelingsToggleBtn"
                  className="feelings-toggle-btn"
                  type="button"
                  aria-expanded={feelingsOpen}
                  onClick={() => setFeelingsOpen((o) => !o)}
                >
                  {feelings.length ? feelings.join(", ") : "Select up to 2 feelings"}
                </button>
                <div id="feelingsDropdownMenu" className={`feelings-dropdown-menu${feelingsOpen ? "" : " hidden"}`}>
                  {FEELING_OPTIONS.map((feeling) => (
                    <label className="feeling-dropdown-option" key={feeling}>
                      <input
                        type="checkbox"
                        className="feeling-checkbox"
                        value={feeling}
                        checked={feelings.includes(feeling)}
                        onChange={() => toggleFeeling(feeling)}
                      />
                      <span>{feeling}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div id="feelingsCounter" className="pill-counter">
                {feelings.length} / 2 selected
              </div>
              <div className="subtle-note">
                Optional, but useful: choosing feeling tags can increase the chance of being considered for themed selections and events such as
                Hip Hop Hour, Rave Nights, Late Night Vibes and similar formats.
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">AI Usage</label>
              <div className="option-grid">
                <label className="check-card">
                  <input type="radio" name="aiUsage" value="none" checked={aiUsage === "none"} onChange={() => setAiUsage("none")} />
                  <span>Without AI</span>
                </label>
                <label className="check-card">
                  <input type="radio" name="aiUsage" value="partial" checked={aiUsage === "partial"} onChange={() => setAiUsage("partial")} />
                  <span>Partially made with AI</span>
                </label>
                <label className="check-card">
                  <input type="radio" name="aiUsage" value="full" checked={aiUsage === "full"} onChange={() => setAiUsage("full")} />
                  <span>Fully made with AI</span>
                </label>
              </div>
            </div>

            {aiUsage === "partial" && (
              <div id="aiDetailsWrap" className="field-group">
                <label className="field-label" htmlFor="aiDetails">
                  AI Details (Optional)
                </label>
                <textarea
                  id="aiDetails"
                  className="field-textarea"
                  placeholder="Example: AI was used for stem cleanup, synth ideas, vocal texture concepts, arrangement suggestions, or lyric support."
                  value={aiDetails}
                  onChange={(e) => setAiDetails(e.target.value)}
                />
              </div>
            )}

            <div className="field-group">
              <label className="field-label">Artist Page Playback</label>
              <label className="toggle-row">
                <span>Allow full tune playback on your artist page</span>
                <span className="switch">
                  <input
                    id="artistPageFullTrack"
                    type="checkbox"
                    checked={artistPageFullTrack}
                    onChange={(e) => setArtistPageFullTrack(e.target.checked)}
                  />
                  <span className="switch-slider" />
                </span>
              </label>
              <div className="subtle-note">
                If this is off, visitors on your artist page will only hear the selected preview. If it is on, they can listen to the full tune
                there.
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Choose Your 60-Second Radio Preview</label>
              <ClipTool
                sourceUrl={previewSourceUrl}
                initialStart={previewStart}
                onMetadata={(duration, start) => {
                  setPreviewDuration(duration);
                  setPreviewStart(start);
                }}
                onStartChange={setPreviewStart}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Rights Declaration</label>
              <label className="checkbox-row" htmlFor="rightsConfirmed">
                <input id="rightsConfirmed" type="checkbox" checked={rightsConfirmed} onChange={(e) => setRightsConfirmed(e.target.checked)} />
                <span className="checkbox-copy">
                  I confirm that I own or control the rights needed to submit this music, including the master, composition, vocals, production
                  elements and any samples used. I also confirm that this submission complies with the platform rules and the Terms, and I
                  understand that unauthorized or misleading submissions may be rejected or removed.
                </span>
              </label>
            </div>

            <div className="action-row">
              <button id="saveTrackBtn" className="submit-link" type="button" disabled={busy} onClick={handleSave}>
                {busy ? (isEdit ? "Saving..." : "Submitting...") : isEdit ? "Save Tune Changes" : "Submit Your Tune"}
              </button>
            </div>
          </div>
        )}

        <div id="status" className="status-box" style={{ color: status.isError ? "#ff8a8a" : "#cfcfcf" }}>
          {status.message}
        </div>

        <div className="sub-link-row">
          <Link className="ghost-link" href="/">
            Back to radio
          </Link>
          {user && hasProfile && (
            <Link className="ghost-link" href={`/artist?user_id=${encodeURIComponent(user.id)}`}>
              My Artist Page
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
