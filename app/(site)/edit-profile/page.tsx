"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import "./edit-profile.css";
import { useAuth } from "@/hooks/useAuth";
import {
  ensureProfileRecord,
  loadOrCreateProfile,
  updateArtistProfile,
  uploadArtistPhoto,
  hasCompletedArtistProfile,
} from "@/lib/profile";
import { COUNTRY_OPTIONS } from "@/lib/countries";

const ROLE_OPTIONS = ["none", "vocalist", "producer", "dj", "rapper", "songwriter", "composer", "musician", "band", "engineer"];
const DEFAULT_NEW_ROLE = "producer";

function normalizeRoleValue(value: string): string {
  const safe = String(value || "none").trim().toLowerCase();
  return ROLE_OPTIONS.includes(safe) ? safe : "none";
}

function getRoleLabel(role: string): string {
  return role === "none" ? "None" : role.charAt(0).toUpperCase() + role.slice(1);
}

type CitySuggestion = { name: string; admin1?: string; country?: string };

type ProfileFields = {
  artist_name?: string | null;
  bio?: string | null;
  nationality?: string | null;
  music_roles?: string[] | null;
  music_role?: string | null;
  city?: string | null;
  date_of_birth?: string | null;
  social_link?: string | null;
  photo_url?: string | null;
  wants_promotions?: boolean | null;
  accepted_terms?: boolean | null;
  show_role_on_artist_page?: boolean | null;
  show_city_on_artist_page?: boolean | null;
  show_birth_on_artist_page?: boolean | null;
  user_id?: string;
};

function EditProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, refreshProfile } = useAuth();

  const [profile, setProfile] = useState<ProfileFields | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [artistName, setArtistName] = useState("");
  const [bio, setBio] = useState("");
  const [nationality, setNationality] = useState("");
  const [roleValues, setRoleValues] = useState<string[]>(["none"]);
  const [city, setCity] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [wantsPromotions, setWantsPromotions] = useState(false);
  const [showRoleOnArtistPage, setShowRoleOnArtistPage] = useState(false);
  const [showCityOnArtistPage, setShowCityOnArtistPage] = useState(false);
  const [showBirthOnArtistPage, setShowBirthOnArtistPage] = useState(false);
  const [status, setStatus] = useState<{ message: string; isError: boolean }>({ message: "", isError: false });
  const [busy, setBusy] = useState(false);

  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [cityListOpen, setCityListOpen] = useState(false);
  const cityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cityPicked = useRef(true);

  // Ported from loadMyProfile() + refreshAuthUI()'s welcome-param handling
  useEffect(() => {
    if (loading) return;

    if (!user) {
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await loadOrCreateProfile(user.id);
        if (cancelled) return;
        setProfile(data);

        if (searchParams.get("welcome") === "1" && (!data || !String(data.artist_name || "").trim())) {
          setStatus({
            message:
              "You're one step away — create your artist profile to unlock your artist page, submit your tune, and start sharing your sound.",
            isError: false,
          });
          const params = new URLSearchParams(searchParams.toString());
          params.delete("welcome");
          const nextQuery = params.toString();
          window.history.replaceState({}, document.title, `/edit-profile${nextQuery ? `?${nextQuery}` : ""}`);
        }
      } catch (err) {
        console.error("loadMyProfile error:", err);
        setProfile(null);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  // Ported from fillProfileForm()
  useEffect(() => {
    if (!profile) return;
    setArtistName(profile.artist_name || "");
    setBio(profile.bio || "");
    setNationality(profile.nationality || "");
    const roles = Array.isArray(profile.music_roles) && profile.music_roles.length ? profile.music_roles : [profile.music_role || "none"];
    setRoleValues(roles.map(normalizeRoleValue));
    setCity(profile.city || "");
    setDateOfBirth(profile.date_of_birth || "");
    setShowRoleOnArtistPage(Boolean(profile.show_role_on_artist_page));
    setShowCityOnArtistPage(Boolean(profile.show_city_on_artist_page));
    setShowBirthOnArtistPage(Boolean(profile.show_birth_on_artist_page));
    setSocialLink(profile.social_link || "");
    setWantsPromotions(Boolean(profile.wants_promotions));
    setPhotoPreview(profile.photo_url || null);
  }, [profile]);

  // Ported from setupPhotoPreview()
  useEffect(() => {
    if (!photoFile) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(photoFile);
  }, [photoFile]);

  // Ported from setupCityAutocomplete()
  const handleCityInput = (value: string) => {
    setCity(value);
    cityPicked.current = false;
    if (cityTimer.current) clearTimeout(cityTimer.current);
    if (value.trim().length < 2) {
      setCityListOpen(false);
      return;
    }
    cityTimer.current = setTimeout(() => {
      fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(value.trim())}&count=8&language=en&format=json`)
        .then((res) => res.json())
        .then((data) => {
          const results: CitySuggestion[] = data.results || [];
          setCitySuggestions(results.slice(0, 8));
          setCityListOpen(results.length > 0);
        })
        .catch((err) => {
          console.warn("City lookup failed:", err);
          setCityListOpen(false);
        });
    }, 350);
  };

  const pickCity = (suggestion: CitySuggestion) => {
    cityPicked.current = true;
    setCity(suggestion.name);
    setCityListOpen(false);
  };

  const handleCityBlur = () => {
    setTimeout(() => {
      setCityListOpen(false);
      if (!cityPicked.current) setCity("");
    }, 250);
  };

  const addRole = () => {
    setRoleValues((current) => {
      if (current.length === 1 && normalizeRoleValue(current[0]) === "none") return [DEFAULT_NEW_ROLE];
      return [...current, DEFAULT_NEW_ROLE];
    });
  };

  const changeRole = (index: number, value: string) => {
    const nextValue = normalizeRoleValue(value);
    if (nextValue === "none") {
      setRoleValues(["none"]);
      return;
    }
    setRoleValues((current) => {
      const next = current.map((r, i) => (i === index ? nextValue : r));
      return next.filter((role, i) => i === index || normalizeRoleValue(role) !== "none");
    });
  };

  const removeRole = (index: number) => {
    setRoleValues((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length ? next : ["none"];
    });
  };

  const getCleanRoles = (): string[] => {
    const normalized = roleValues.map(normalizeRoleValue);
    if (normalized.includes("none")) return ["none"];
    const unique: string[] = [];
    normalized.forEach((role) => {
      if (!unique.includes(role)) unique.push(role);
    });
    return unique.length ? unique : ["none"];
  };

  const handleSave = async () => {
    if (!artistName.trim()) {
      setStatus({ message: "Please enter your (artist)name.", isError: true });
      return;
    }
    if (!user) {
      setStatus({ message: "You must be logged in before editing your profile.", isError: true });
      return;
    }

    setBusy(true);
    setStatus({ message: "Checking login...", isError: false });

    try {
      let currentProfile = profile;
      if (!currentProfile) {
        setStatus({ message: "Preparing your artist profile...", isError: false });
        currentProfile = await ensureProfileRecord(user.id);
        if (!currentProfile) {
          setStatus({ message: "Could not prepare your artist profile. Please try again.", isError: true });
          setBusy(false);
          return;
        }
        setProfile(currentProfile);
      }

      const photoUrl = photoFile ? await uploadArtistPhoto(user.id, photoFile) : currentProfile?.photo_url || "";
      setStatus({ message: "Saving profile...", isError: false });

      const musicRoles = getCleanRoles();
      await updateArtistProfile(user.id, {
        artist_name: artistName.trim(),
        bio: bio.trim() || null,
        nationality: nationality.trim() || null,
        music_roles: musicRoles,
        music_role: musicRoles.includes("none") ? "none" : musicRoles[0],
        city: city.trim() || null,
        date_of_birth: dateOfBirth || null,
        show_role_on_artist_page: showRoleOnArtistPage,
        show_city_on_artist_page: showCityOnArtistPage,
        show_birth_on_artist_page: showBirthOnArtistPage,
        social_link: socialLink.trim() || null,
        photo_url: photoUrl || null,
        wants_promotions: wantsPromotions,
        accepted_terms: currentProfile?.accepted_terms ?? true,
      });

      setStatus({ message: "Profile updated successfully.", isError: false });
      await refreshProfile();
      router.push(`/artist?user_id=${encodeURIComponent(user.id)}`);
    } catch (err) {
      console.error("save profile error:", err);
      setStatus({ message: (err as Error).message || "Something went wrong while saving your profile.", isError: true });
    } finally {
      setBusy(false);
    }
  };

  const hasProfile = hasCompletedArtistProfile(profile as { user_id: string; artist_name?: string | null } | null);
  const viewArtistHref = user && hasProfile ? `/artist?user_id=${encodeURIComponent(user.id)}` : null;

  return (
    <main className="page-wrap">
      <section className="edit-profile-page-hero" aria-label="Edit profile page title">
        <h1>Edit your profile</h1>
      </section>

      <section className="panel-card">
        {!loading && !user && (
          <div className="notice-box">
            You need to be logged in before editing your artist profile.
            <div className="sub-link-row" style={{ marginTop: 12 }}>
              <Link className="ghost-link" href="/login">
                Login
              </Link>
            </div>
          </div>
        )}

        {!loading && !profileLoading && user && !profile && (
          <div className="notice-box">
            You do not have an artist profile yet.
            <div className="sub-link-row" style={{ marginTop: 12 }}>
              <Link className="ghost-link" href="/edit-profile?welcome=1">
                Retry profile setup
              </Link>
            </div>
          </div>
        )}

        {!loading && user && profile && (
          <div className="form-grid">
            <div className="field-group">
              <label className="field-label" htmlFor="artistName">
                (Artist)name
              </label>
              <input
                id="artistName"
                className="field-input"
                type="text"
                placeholder="Enter your (artist)name"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="bio">
                Short Bio{" "}
                <span style={{ fontWeight: 400, color: bio.length > 220 ? "rgba(255,140,0,0.8)" : "rgba(255,255,255,0.35)", fontSize: 11 }}>
                  {bio.length}/250
                </span>
              </label>
              <textarea
                id="bio"
                className="field-textarea"
                placeholder="Tell listeners something about yourself"
                maxLength={250}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
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
              <div className="inline-toggle inline-toggle--left">
                <label className="toggle-switch" htmlFor="showBirthOnArtistPage">
                  <input
                    id="showBirthOnArtistPage"
                    type="checkbox"
                    checked={showBirthOnArtistPage}
                    onChange={(e) => setShowBirthOnArtistPage(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
                <span className="inline-toggle-label">Show on profile</span>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="nationality">
                Nationality
              </label>
              <select id="nationality" className="field-select" value={nationality} onChange={(e) => setNationality(e.target.value)}>
                <option value="">Select your nationality</option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group" style={{ position: "relative" }}>
              <label className="field-label" htmlFor="city">
                City
              </label>
              <input
                id="city"
                className="field-input"
                type="text"
                placeholder="Type to search cities..."
                autoComplete="off"
                value={city}
                onChange={(e) => handleCityInput(e.target.value)}
                onBlur={handleCityBlur}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setCityListOpen(false);
                }}
              />
              <ul className="city-suggestions" style={{ display: cityListOpen ? "block" : "none" }}>
                {citySuggestions.map((r, i) => {
                  const parts = [r.name];
                  if (r.admin1 && r.admin1 !== r.name) parts.push(r.admin1);
                  if (r.country) parts.push(r.country);
                  return (
                    <li key={i} onMouseDown={(e) => { e.preventDefault(); pickCity(r); }}>
                      {parts.join(", ")}
                    </li>
                  );
                })}
              </ul>
              <div className="inline-toggle inline-toggle--left">
                <label className="toggle-switch" htmlFor="showCityOnArtistPage">
                  <input
                    id="showCityOnArtistPage"
                    type="checkbox"
                    checked={showCityOnArtistPage}
                    onChange={(e) => setShowCityOnArtistPage(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
                <span className="inline-toggle-label">Show on profile</span>
              </div>
            </div>

            <div className="field-group field-group-wide">
              <label className="field-label">Musical role</label>
              <div className="role-list">
                {(roleValues.length ? roleValues : ["none"]).map((value, index) => (
                  <div className="role-row" key={index}>
                    <select className="field-select" value={normalizeRoleValue(value)} onChange={(e) => changeRole(index, e.target.value)}>
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {getRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="role-remove-btn"
                      aria-label="Remove role"
                      disabled={roleValues.length === 1}
                      onClick={() => removeRole(index)}
                    >
                      <span aria-hidden="true">−</span>
                    </button>
                  </div>
                ))}
              </div>
              <button id="addRoleBtn" className="glass-add-btn" type="button" onClick={addRole}>
                + Add role
              </button>
              <div className="form-meta">Optional. Choose one or more roles. Select none if you do not want to show a role.</div>
              <div className="inline-toggle inline-toggle--left">
                <label className="toggle-switch" htmlFor="showRoleOnArtistPage">
                  <input
                    id="showRoleOnArtistPage"
                    type="checkbox"
                    checked={showRoleOnArtistPage}
                    onChange={(e) => setShowRoleOnArtistPage(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
                <span className="inline-toggle-label">Show on profile</span>
              </div>
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

            <div className="field-group artist-photo-field">
              <label className="field-label" htmlFor="photoFile">
                Artist Photo
              </label>
              <label className="artist-photo-preview-box" htmlFor="photoFile" aria-label="Choose artist photo">
                {photoPreview ? (
                  <Image className="artist-photo-preview" src={photoPreview} alt="Artist photo preview" width={260} height={260} unoptimized />
                ) : (
                  <span className="artist-photo-preview-empty">Choose file</span>
                )}
              </label>
              <input
                id="photoFile"
                className="field-file artist-photo-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
              <div className="form-meta">Accepted: JPG, PNG or WebP. Leave empty to keep your current photo.</div>
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
          </div>
        )}

        {!loading && user && profile && (
          <div className="action-row">
            <button id="saveProfileBtn" className="submit-link" type="button" disabled={busy} onClick={handleSave}>
              {busy ? "Saving profile..." : "Save Profile"}
            </button>
          </div>
        )}

        <div id="status" className="status-box" style={{ color: status.isError ? "#ff8a8a" : "#cfcfcf" }}>
          {status.message}
        </div>

        <div className="sub-link-row">
          <Link className="ghost-link" href="/">
            Back to homepage
          </Link>
          <Link className="ghost-link" href={viewArtistHref || "#"}>
            View artist page
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function EditProfilePage() {
  return (
    <Suspense fallback={<main className="page-wrap" />}>
      <EditProfileContent />
    </Suspense>
  );
}
