"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./join.css";
import { useAuth } from "@/hooks/useAuth";
import { hasCompletedArtistProfile, saveArtistProfile, uploadArtistPhoto } from "@/lib/profile";
import { COUNTRY_OPTIONS } from "@/lib/countries";

type ProfileFields = {
  artist_name?: string;
  bio?: string;
  nationality?: string;
  date_of_birth?: string;
  social_link?: string;
  photo_url?: string;
};

export default function JoinPage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();

  const [artistName, setArtistName] = useState("");
  const [bio, setBio] = useState("");
  const [nationality, setNationality] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [wantsPromotions, setWantsPromotions] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [status, setStatus] = useState<{ message: string; isError: boolean }>({ message: "", isError: false });
  const [busy, setBusy] = useState(false);

  const p = profile as ProfileFields | null;
  const profileHasArtistName = hasCompletedArtistProfile(profile);
  const profileIncomplete = Boolean(profile) && !profileHasArtistName;

  // Ported from renderPageState(): a profile row without an artist_name
  // means onboarding was started but never finished on edit-profile.
  useEffect(() => {
    if (!loading && user && profileIncomplete) {
      router.replace("/edit-profile?welcome=1");
    }
  }, [loading, user, profileIncomplete, router]);

  useEffect(() => {
    if (p) {
      setArtistName(p.artist_name || "");
      setBio(p.bio || "");
      setNationality(p.nationality || "");
      setDateOfBirth(p.date_of_birth || "");
      setSocialLink(p.social_link || "");
    }
  }, [p]);

  const handleSubmit = async () => {
    setStatus({ message: "", isError: false });

    if (!artistName.trim()) {
      setStatus({ message: "Please enter your artist name.", isError: true });
      return;
    }
    if (!acceptedTerms) {
      setStatus({ message: "You need to accept the terms and conditions.", isError: true });
      return;
    }
    if (!user) {
      setStatus({ message: "You must be logged in before creating your profile.", isError: true });
      return;
    }

    setBusy(true);
    setStatus({ message: "Checking account...", isError: false });

    try {
      const photoUrl = await uploadArtistPhoto(user.id, photoFile);
      setStatus({ message: "Saving artist profile...", isError: false });

      await saveArtistProfile(
        {
          user_id: user.id,
          artist_name: artistName.trim(),
          bio: bio.trim() || null,
          nationality: nationality.trim() || null,
          date_of_birth: dateOfBirth || null,
          social_link: socialLink.trim() || null,
          photo_url: photoUrl || null,
          wants_promotions: wantsPromotions,
          accepted_terms: acceptedTerms,
        },
        user.id
      );

      setStatus({ message: "Artist profile created successfully.", isError: false });
      await refreshProfile();
      router.push(`/artist?user_id=${encodeURIComponent(user.id)}`);
    } catch (err) {
      console.error(err);
      setStatus({ message: (err as Error).message || "Something went wrong while saving your profile.", isError: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page-wrap">
      <section className="hero-card">
        <div className="section-kicker">Artist Onboarding</div>
        <h1 className="page-title">Create Your Artist Profile</h1>
        <p className="page-note">
          Set up your artist profile to enter the platform. After that, you can submit your tune for radio approval.
        </p>
      </section>

      <section className="panel-card">
        {!loading && !user && (
          <div className="notice-box">You need to be logged in before creating your artist profile.</div>
        )}

        {!loading && user && profileHasArtistName && (
          <div className="notice-box">
            You already have an artist profile.
            <div className="sub-link-row" style={{ marginTop: 12 }}>
              <Link className="ghost-link" href={`/artist?user_id=${encodeURIComponent(user.id)}`}>
                My Artist Page
              </Link>
              <Link className="ghost-link" href="/edit-profile">
                Edit Profile
              </Link>
            </div>
          </div>
        )}

        {!loading && user && !profile && (
          <div className="form-grid">
            <div className="field-group">
              <label className="field-label" htmlFor="artistName">
                Artist Name
              </label>
              <input
                id="artistName"
                className="field-input"
                type="text"
                placeholder="Enter your artist name"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="bio">
                Short Bio
              </label>
              <textarea
                id="bio"
                className="field-textarea"
                placeholder="Tell listeners something about yourself"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="nationality">
                Nationality
              </label>
              <select
                id="nationality"
                className="field-select"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
              >
                <option value="">Select your nationality</option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="dateOfBirth">
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                className="field-input"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="socialLink">
                Social / Streaming Link
              </label>
              <input
                id="socialLink"
                className="field-input"
                type="text"
                placeholder="https://..."
                value={socialLink}
                onChange={(e) => setSocialLink(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="photoFile">
                Artist Photo
              </label>
              <input
                id="photoFile"
                className="field-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Promotions</label>
              <label className="checkbox-row" htmlFor="wantsPromotions">
                <input
                  id="wantsPromotions"
                  type="checkbox"
                  checked={wantsPromotions}
                  onChange={(e) => setWantsPromotions(e.target.checked)}
                />
                <span className="checkbox-copy">Keep me updated on promotions and platform updates.</span>
              </label>
            </div>

            <div className="field-group">
              <label className="field-label">Terms</label>
              <label className="checkbox-row" htmlFor="acceptedTerms">
                <input
                  id="acceptedTerms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span className="checkbox-copy">I accept the terms and conditions.</span>
              </label>
            </div>

            <div className="action-row">
              <button id="saveProfileBtn" className="submit-link" type="button" disabled={busy} onClick={handleSubmit}>
                Create Artist Profile
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
        </div>
      </section>
    </main>
  );
}
