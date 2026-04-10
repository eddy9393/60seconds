const supabaseClient = window.supabase.createClient(
  "https://rgoutegbcpjytplqcwze.supabase.co",
  "sb_publishable_255qyDKS77nMU0pbedfa_A_3hdgtEHh"
);

const GENRE_OPTIONS = [
  "Afrobeats", "Alternative", "Ambient", "Amapiano", "Classical", "Country",
  "Dance", "Dancehall", "Deep House", "Disco", "Drill", "Drum & Bass",
  "Dubstep", "EDM", "Electronic", "Folk", "Funk", "Garage", "Gospel",
  "Grime", "Hardstyle", "Hip Hop", "House", "Indie", "Jazz", "Latin",
  "Lo-fi", "Pop", "R&B", "Rap", "Reggae", "Reggaeton", "Rock", "Soul",
  "Tech House", "Techno", "Trap", "Trance", "UK Garage", "Other"
];

const FEELING_OPTIONS = [
  "Energetic", "Emotional", "Melancholic", "Uplifting", "Dark",
  "Dreamy", "Romantic", "Aggressive", "Hypnotic", "Chill",
  "Party", "Nostalgic", "Sexy", "Epic", "Moody",
  "Spiritual", "Happy", "Sad", "Raw", "Late Night"
];

const els = {
  header: {
    showLoginBtn: document.getElementById("showLoginBtn"),
    headerAvatarBtn: document.getElementById("headerAvatarBtn"),
    headerAvatarImage: document.getElementById("headerAvatarImage"),
    headerAvatarFallback: document.getElementById("headerAvatarFallback"),
    accountMenu: document.getElementById("accountMenu"),
    accountProfileLink: document.getElementById("accountProfileLink"),
    accountNotificationsLink: document.getElementById("accountNotificationsLink"),
    logoutBtn: document.getElementById("logout"),
    currencyBadge: document.getElementById("currencyBadge"),
    currencyValue: document.getElementById("currencyValue")
  },

  desktopNav: {
    loginLink: document.getElementById("desktopLoginLink"),
    logoutBtn: document.getElementById("desktopLogoutBtn"),
    profileLink: document.getElementById("desktopProfileLink"),
    notificationsLink: document.getElementById("desktopNotificationsLink"),
    trackLink: document.getElementById("desktopTrackLink")
  },

  mobileNav: {
    loginLink: document.getElementById("mobileLoginLink"),
    profileLink: document.getElementById("mobileProfileLink"),
    notificationsLink: document.getElementById("mobileNotificationsLink"),
    trackLink: document.getElementById("mobileTrackLink")
  },

  page: {
    title: document.getElementById("pageTitle"),
    note: document.getElementById("pageNote"),
    loginRequiredBox: document.getElementById("loginRequiredBox"),
    profileRequiredBox: document.getElementById("profileRequiredBox"),
    trackStatusBox: document.getElementById("trackStatusBox"),
    formWrap: document.getElementById("formWrap"),
    status: document.getElementById("status"),
    backToArtistPageLink: document.getElementById("backToArtistPageLink")
  },

  form: {
    trackTitleInput: document.getElementById("trackTitle"),
    trackFileInput: document.getElementById("trackFile"),
    genrePrimaryInput: document.getElementById("genrePrimary"),
    genreSecondaryInput: document.getElementById("genreSecondary"),
    feelingsGrid: document.getElementById("feelingsGrid"),
    feelingsDropdown: document.getElementById("feelingsDropdown"),
    feelingsToggleBtn: document.getElementById("feelingsToggleBtn"),
    feelingsDropdownMenu: document.getElementById("feelingsDropdownMenu"),
    feelingsCounter: document.getElementById("feelingsCounter"),
    artistPageFullTrackInput: document.getElementById("artistPageFullTrack"),
    aiDetailsWrap: document.getElementById("aiDetailsWrap"),
    aiDetailsInput: document.getElementById("aiDetails"),
    rightsConfirmedInput: document.getElementById("rightsConfirmed"),
    saveTrackBtn: document.getElementById("saveTrackBtn")
  },

  clip: {
    clipTool: document.getElementById("clipTool"),
    clipToolPlaceholder: document.getElementById("clipToolPlaceholder"),
    previewAudio: document.getElementById("previewAudio"),
    clipSelection: document.getElementById("clipSelection"),
    clipStartSlider: document.getElementById("clipStartSlider"),
    clipStartLabel: document.getElementById("clipStartLabel"),
    clipEndLabel: document.getElementById("clipEndLabel"),
    clipDurationLabel: document.getElementById("clipDurationLabel"),
    fullTrackDurationLabel: document.getElementById("fullTrackDurationLabel"),
    clipPlayBtn: document.getElementById("clipPlayBtn"),
    clipProgressFill: document.getElementById("clipProgressFill"),
    clipCurrentTime: document.getElementById("clipCurrentTime")
  }
};

const state = {
  currentProfileData: null,
  currentTrackData: null,
  currentUser: null,
  previewObjectUrl: null,
  previewTrackDuration: 0,
  previewStartSeconds: 0,
  previewPlayTimer: null
};

function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle("hidden", hidden);
}

function setText(element, value) {
  if (!element) return;
  element.textContent = value ?? "";
}

function setCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    setText(els.header.currencyValue, "0");
    return;
  }

  setText(els.header.currencyValue, String(Math.max(0, Math.floor(amount))));
}

function setStatus(message, isError = false) {
  setText(els.page.status, message || "");
  els.page.status.style.color = isError ? "#ff8a8a" : "#cfcfcf";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function closeHeaderPanels() {
  setHidden(els.header.accountMenu, true);
}


function applyRuntimeCurrencySnapshot() {
  try {
    const raw = localStorage.getItem("ssfm_profile_runtime_state");
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.coins !== "undefined" && els.header?.currencyValue) {
      els.header.currencyValue.textContent = String(Math.max(0, Math.floor(Number(data.coins) || 0)));
    }
  } catch {}
}

window.addEventListener("storage", (event) => {
  if (event.key === "ssfm_profile_runtime_state") {
    applyRuntimeCurrencySnapshot();
  }
});
window.addEventListener("ssfm:coins-updated", () => {
  applyRuntimeCurrencySnapshot();
});

function getProfileHref(profile) {
  if (!profile) return "join.html";
  if (profile.user_id) {
    return `artist.html?user_id=${encodeURIComponent(profile.user_id)}`;
  }
  return "join.html";
}

function getSelectedFeelings() {
  return Array.from(document.querySelectorAll(".feeling-checkbox:checked")).map((el) => el.value);
}

function updateFeelingsDropdownButton() {
  if (!els.form.feelingsToggleBtn) return;
  const selected = getSelectedFeelings();
  els.form.feelingsToggleBtn.textContent = selected.length ? selected.join(", ") : "Select up to 2 feelings";
}

function getSelectedAiUsage() {
  const selected = document.querySelector('input[name="aiUsage"]:checked');
  return selected ? selected.value : "";
}

function updateFeelingsCounter() {
  const selected = getSelectedFeelings();
  setText(els.form.feelingsCounter, `${selected.length} / 2 selected`);
  updateFeelingsDropdownButton();
}

function enforceFeelingLimit(changedInput) {
  const selected = getSelectedFeelings();
  if (selected.length > 2) {
    changedInput.checked = false;
  }
  updateFeelingsCounter();
}

function populateGenreSelects() {
  [els.form.genrePrimaryInput, els.form.genreSecondaryInput].forEach((select, index) => {
    const placeholder = index === 0 ? "Select primary genre" : "Select secondary genre";
    select.innerHTML = `<option value="">${placeholder}</option>`;

    GENRE_OPTIONS.forEach((genre) => {
      const option = document.createElement("option");
      option.value = genre;
      option.textContent = genre;
      select.appendChild(option);
    });
  });
}

function renderFeelingOptions(selectedValues = []) {
  const container = els.form.feelingsDropdownMenu || els.form.feelingsGrid;
  if (!container) return;
  container.innerHTML = "";

  FEELING_OPTIONS.forEach((feeling) => {
    const label = document.createElement("label");
    label.className = els.form.feelingsDropdownMenu ? "feeling-dropdown-option" : "check-card";
    label.innerHTML = `
      <input type="checkbox" class="feeling-checkbox" value="${escapeHtml(feeling)}">
      <span>${escapeHtml(feeling)}</span>
    `;
    const checkbox = label.querySelector("input");
    checkbox.checked = selectedValues.includes(feeling);
    checkbox.addEventListener("change", () => enforceFeelingLimit(checkbox));
    container.appendChild(label);
  });

  updateFeelingsCounter();
}

function updateAiDetailsVisibility() {
  const aiUsage = getSelectedAiUsage();
  setHidden(els.form.aiDetailsWrap, aiUsage !== "partial");

  if (aiUsage !== "partial") {
    els.form.aiDetailsInput.value = "";
  }
}

function setHeaderAvatar(photoUrl, artistName) {
  if (photoUrl) {
    els.header.headerAvatarImage.src = photoUrl;
    setHidden(els.header.headerAvatarImage, false);
    setHidden(els.header.headerAvatarFallback, true);
    return;
  }

  setHidden(els.header.headerAvatarImage, true);
  setHidden(els.header.headerAvatarFallback, false);
  setText(els.header.headerAvatarFallback, (artistName || "A").charAt(0).toUpperCase());
}


function isMobileHeaderMenuMode() {
  return window.matchMedia("(max-width: 768px)").matches;
}

function handleHeaderAvatarAction(profileHref) {
  const menuEl = els.header.accountMenu;
  if (isMobileHeaderMenuMode() && menuEl) {
    menuEl.classList.toggle("hidden");
    return;
  }
  if (menuEl) {
    menuEl.classList.add("hidden");
  }
  window.location.href = profileHref || "artist.html";
}

function applyMenuState(user, profile, track) {
  const isLoggedIn = Boolean(user);
  const hasProfile = Boolean(profile);
  const hasTrack = Boolean(track);

  setHidden(els.desktopNav.loginLink, isLoggedIn);
  setHidden(els.mobileNav.loginLink, isLoggedIn);
  setHidden(els.desktopNav.logoutBtn, !isLoggedIn);

  setHidden(els.desktopNav.profileLink, !isLoggedIn);
  setHidden(els.mobileNav.profileLink, !isLoggedIn);

  setHidden(els.desktopNav.notificationsLink, !isLoggedIn);
  setHidden(els.mobileNav.notificationsLink, !isLoggedIn);

  setHidden(els.desktopNav.trackLink, !isLoggedIn || !hasProfile);
  setHidden(els.mobileNav.trackLink, !isLoggedIn || !hasProfile);

  const profileHref = getProfileHref(profile);

  els.desktopNav.profileLink.href = profileHref;
  els.mobileNav.profileLink.href = profileHref;
  els.header.accountProfileLink.href = profileHref;

  setHidden(els.header.accountProfileLink, !isLoggedIn);

  els.desktopNav.trackLink.setAttribute("data-track-mode", hasTrack ? "edit" : "submit");
  els.mobileNav.trackLink.setAttribute("data-track-mode", hasTrack ? "edit" : "submit");

  if (hasProfile && profile.user_id) {
    const artistUrl = `artist.html?user_id=${encodeURIComponent(profile.user_id)}`;
    els.page.backToArtistPageLink.href = artistUrl;
    setHidden(els.page.backToArtistPageLink, false);
  } else {
    els.page.backToArtistPageLink.href = "#";
    setHidden(els.page.backToArtistPageLink, true);
  }
}

function setLoggedOutView() {
  closeHeaderPanels();

  setHidden(els.header.showLoginBtn, false);
  setHidden(els.header.headerAvatarBtn, true);
  setHidden(els.header.headerAvatarImage, true);
  setHidden(els.header.headerAvatarFallback, true);

  els.header.headerAvatarImage.src = "";
  setHidden(els.header.accountProfileLink, true);
  els.header.accountProfileLink.href = "javascript:void(0)";

  setHidden(els.page.loginRequiredBox, false);
  setHidden(els.page.profileRequiredBox, true);
  setHidden(els.page.trackStatusBox, true);
  setHidden(els.page.formWrap, true);

  state.currentProfileData = null;
  state.currentTrackData = null;
  state.currentUser = null;

  applyMenuState(null, null, null);
}

function setLoggedInHeader() {
  setHidden(els.header.showLoginBtn, true);
  setHidden(els.header.headerAvatarBtn, false);
  setHidden(els.header.accountMenu, true);
  setHidden(els.header.currencyBadge, false);
}

function setPageMode(track) {
  const isEdit = Boolean(track);

  setText(els.page.title, "Enter The Radio");
  setText(
    els.page.note,
    isEdit
      ? "This is your minute of fame, let's make it memorable!"
      : "Submit your 60 second preview and join the next wave."
  );

  setText(els.form.saveTrackBtn, isEdit ? "Save Track Changes" : "Submit Your Track");
}

function renderTrackStatus(track) {
  if (!track) {
    setHidden(els.page.trackStatusBox, true);
    els.page.trackStatusBox.innerHTML = "";
    return;
  }

  setHidden(els.page.trackStatusBox, false);

  let title = "Track status";
  let titleClass = "";
  let copy = "Your track is saved.";

  if (track.status === "pending") {
    title = "⏳ Your track is under review";
    titleClass = "pending";
    copy = "Your submission is waiting for admin approval. If you upload a new file later, it will go back into review before it can go live again.";
  } else if (track.status === "approved") {
    title = "✅ Your track is live";
    titleClass = "approved";
    copy = "Your track is approved and can play on the radio. If you upload a new file later, it will require a new admin approval before going live again.";
  } else if (track.status === "rejected") {
    title = "❌ Your track was not approved";
    titleClass = "rejected";
    copy = "You can update your submission and try again. Uploading a new file will send it back for review.";
  }

  els.page.trackStatusBox.innerHTML = `
    <div class="track-status-title ${titleClass}">${title}</div>
    <div class="track-status-copy">${copy}</div>
  `;
}

function stopPreviewPlayback() {
  if (state.previewPlayTimer) {
    clearInterval(state.previewPlayTimer);
    state.previewPlayTimer = null;
  }

  els.clip.previewAudio.pause();
  setText(els.clip.clipPlayBtn, "Play Selected 60 sec");
  els.clip.clipProgressFill.style.width = "0%";
  setText(els.clip.clipCurrentTime, "0:00");
}

function updateClipUi() {
  const effectiveDuration = Math.min(60, Math.max(1, Math.floor(state.previewTrackDuration || 0)));
  const maxStart = Math.max(0, Math.floor(state.previewTrackDuration - effectiveDuration));
  const start = Math.min(Math.max(0, Number(state.previewStartSeconds) || 0), maxStart);
  const end = Math.min(start + effectiveDuration, Math.floor(state.previewTrackDuration || 0));

  els.clip.clipStartSlider.max = String(maxStart);
  els.clip.clipStartSlider.value = String(start);

  setText(els.clip.clipStartLabel, formatTime(start));
  setText(els.clip.clipEndLabel, formatTime(end));
  setText(els.clip.clipDurationLabel, `${effectiveDuration} sec`);
  setText(els.clip.fullTrackDurationLabel, `Full track: ${formatTime(state.previewTrackDuration)}`);

  const widthPercent = state.previewTrackDuration > 0 ? (effectiveDuration / state.previewTrackDuration) * 100 : 100;
  const leftPercent = state.previewTrackDuration > 0 ? (start / state.previewTrackDuration) * 100 : 0;

  els.clip.clipSelection.style.width = `${Math.max(widthPercent, 8)}%`;
  els.clip.clipSelection.style.left = `${leftPercent}%`;

  setHidden(els.clip.clipTool, false);
  setHidden(els.clip.clipToolPlaceholder, true);
}

function loadPreviewSource(sourceUrl, preferredStart = 0) {
  stopPreviewPlayback();

  state.previewTrackDuration = 0;
  state.previewStartSeconds = Math.max(0, Number(preferredStart) || 0);

  els.clip.previewAudio.src = sourceUrl;
  els.clip.previewAudio.load();

  els.clip.previewAudio.onloadedmetadata = () => {
    state.previewTrackDuration = Number.isFinite(els.clip.previewAudio.duration)
      ? Math.floor(els.clip.previewAudio.duration)
      : 0;

    if (!state.previewTrackDuration || state.previewTrackDuration <= 0) {
      setHidden(els.clip.clipTool, true);
      setHidden(els.clip.clipToolPlaceholder, false);
      setText(els.clip.clipToolPlaceholder, "This track could not be analysed for preview selection.");
      return;
    }

    const effectiveDuration = Math.min(60, state.previewTrackDuration);
    const maxStart = Math.max(0, state.previewTrackDuration - effectiveDuration);
    state.previewStartSeconds = Math.min(state.previewStartSeconds, maxStart);

    updateClipUi();
  };

  els.clip.previewAudio.onerror = () => {
    setHidden(els.clip.clipTool, true);
    setHidden(els.clip.clipToolPlaceholder, false);
    setText(els.clip.clipToolPlaceholder, "The preview tool could not load this track.");
  };
}

function fillTrackForm(track) {
  els.form.trackTitleInput.value = track?.title || "";
  els.form.genrePrimaryInput.value = track?.genre_primary || "";
  els.form.genreSecondaryInput.value = track?.genre_secondary || "";

  renderFeelingOptions(Array.isArray(track?.feeling_tags) ? track.feeling_tags : []);

  const aiUsage = track?.ai_usage || "";
  document.querySelectorAll('input[name="aiUsage"]').forEach((input) => {
    input.checked = input.value === aiUsage;
  });

  els.form.aiDetailsInput.value = track?.ai_details || "";
  els.form.rightsConfirmedInput.checked = Boolean(track?.rights_confirmed);
  if (els.form.artistPageFullTrackInput) {
    els.form.artistPageFullTrackInput.checked = Boolean(track?.artist_page_full_track);
  }
  updateAiDetailsVisibility();

  const previewStart = Number(track?.preview_start_seconds || 0);

  if (track?.file_url) {
    loadPreviewSource(track.file_url, previewStart);
    return;
  }

  stopPreviewPlayback();
  setHidden(els.clip.clipTool, true);
  setHidden(els.clip.clipToolPlaceholder, false);
  setText(els.clip.clipToolPlaceholder, "Upload or load a track first to choose your 60 second radio preview.");
}

async function loadMyProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("user_id, artist_name, photo_url, coins")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    state.currentProfileData = null;
    setHidden(els.header.currencyBadge, true);
    setCurrency(0);
    setHeaderAvatar("", "A");
    return null;
  }

  state.currentProfileData = data;
  setHidden(els.header.currencyBadge, false);
  setCurrency(data.coins || 0);
  setHeaderAvatar(data.photo_url, data.artist_name);
  return data;
}

async function loadMyTrack(userId) {
  const { data, error } = await supabaseClient
    .from("tracks")
    .select("id, user_id, title, artist, file_url, status, created_at, genre_primary, genre_secondary, feeling_tags, ai_usage, ai_details, rights_confirmed, preview_start_seconds, preview_duration_seconds, artist_page_full_track")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    state.currentTrackData = null;
    return null;
  }

  state.currentTrackData = data;
  return data;
}

async function uploadTrackIfNeeded(userId, file) {
  if (!file) {
    return state.currentTrackData?.file_url || "";
  }

  const cleanName = file.name.replace(/\s+/g, "-");
  const filePath = `${userId}/${Date.now()}-${cleanName}`;

  const { error } = await supabaseClient
    .storage
    .from("tracks")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) {
    throw new Error("Track upload failed: " + error.message);
  }

  const { data } = supabaseClient
    .storage
    .from("tracks")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

async function handleLogout() {
  els.header.logoutBtn.disabled = true;
  els.desktopNav.logoutBtn.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      setStatus(error.message, true);
      return;
    }

    await refreshPageState();
  } catch (err) {
    console.error(err);
    setStatus("Logout failed. Try again.", true);
  } finally {
    els.header.logoutBtn.disabled = false;
    els.desktopNav.logoutBtn.disabled = false;
  }
}

async function refreshPageState() {
  const { data, error } = await supabaseClient.auth.getSession();
  const user = error ? null : data?.session?.user || null;

  if (!user) {
    setLoggedOutView();
    fillTrackForm(null);
    setPageMode(null);
    setStatus("");
    return;
  }

  state.currentUser = user;
  setLoggedInHeader();

  const profile = await loadMyProfile(user.id);
  const track = await loadMyTrack(user.id);

  applyMenuState(user, profile, track);
  setPageMode(track);
  renderTrackStatus(track);

  if (!profile) {
    setHidden(els.page.loginRequiredBox, true);
    setHidden(els.page.profileRequiredBox, false);
    setHidden(els.page.formWrap, true);
    fillTrackForm(track);
    return;
  }

  setHidden(els.page.loginRequiredBox, true);
  setHidden(els.page.profileRequiredBox, true);
  setHidden(els.page.formWrap, false);
  fillTrackForm(track);
}

async function handleSaveTrack() {
  const title = els.form.trackTitleInput.value.trim();
  const file = els.form.trackFileInput.files[0];
  const genrePrimary = els.form.genrePrimaryInput.value.trim();
  const genreSecondary = els.form.genreSecondaryInput.value.trim();
  const feelingTags = getSelectedFeelings();
  const aiUsage = getSelectedAiUsage();
  const aiDetails = els.form.aiDetailsInput.value.trim();
  const rightsConfirmed = els.form.rightsConfirmedInput.checked;
  const artistPageFullTrack = Boolean(els.form.artistPageFullTrackInput?.checked);

  if (!state.currentUser) {
    setStatus("You must be logged in before submitting a track.", true);
    return;
  }

  if (!state.currentProfileData) {
    setStatus("You need to create your artist profile first.", true);
    return;
  }

  if (!title) {
    setStatus("Please enter your track title.", true);
    return;
  }

  if (!genrePrimary) {
    setStatus("Please select a primary genre.", true);
    return;
  }

  if (genreSecondary && genreSecondary === genrePrimary) {
    setStatus("Secondary genre must be different from the primary genre.", true);
    return;
  }

  if (feelingTags.length > 2) {
    setStatus("You can select a maximum of 2 feeling tags.", true);
    return;
  }

  if (!aiUsage) {
    setStatus("Please select how AI was used for this track.", true);
    return;
  }

  if (!rightsConfirmed) {
    setStatus("You need to confirm the rights declaration before submitting.", true);
    return;
  }

  if (!state.currentTrackData && !file) {
    setStatus("Please upload your track file.", true);
    return;
  }

  if (!els.clip.previewAudio.src) {
    setStatus("Please load a track and choose your 60 second radio preview.", true);
    return;
  }

  if (!state.previewTrackDuration || state.previewTrackDuration <= 0) {
    setStatus("The preview tool could not read the track duration.", true);
    return;
  }

  els.form.saveTrackBtn.disabled = true;
  setStatus("Uploading and saving track...");

  try {
    const fileUrl = await uploadTrackIfNeeded(state.currentUser.id, file);

    if (!fileUrl) {
      setStatus("No valid track file could be saved.", true);
      return;
    }

    const effectivePreviewDuration = Math.min(60, Math.max(1, Math.floor(state.previewTrackDuration)));
    const safePreviewStart = Math.max(0, Math.floor(state.previewStartSeconds || 0));

    const isNewFile = Boolean(file);
    const shouldResetStatus = isNewFile;

    const nextStatus = state.currentTrackData
      ? (shouldResetStatus ? "pending" : (state.currentTrackData.status || "pending"))
      : "pending";

    const payload = {
      title,
      artist: state.currentProfileData.artist_name || null,
      file_url: fileUrl,
      user_id: state.currentUser.id,
      status: nextStatus,
      genre_primary: genrePrimary,
      genre_secondary: genreSecondary || null,
      feeling_tags: feelingTags.length ? feelingTags : [],
      ai_usage: aiUsage,
      ai_details: aiUsage === "partial" ? (aiDetails || null) : null,
      rights_confirmed: rightsConfirmed,
      preview_start_seconds: safePreviewStart,
      preview_duration_seconds: effectivePreviewDuration,
      artist_page_full_track: artistPageFullTrack
    };

    if (state.currentTrackData?.id) {
      const { error: updateError } = await supabaseClient
        .from("tracks")
        .update(payload)
        .eq("id", state.currentTrackData.id);

      if (updateError) {
        setStatus("Saving track failed: " + updateError.message, true);
        return;
      }
    } else {
      const { error: insertError } = await supabaseClient
        .from("tracks")
        .insert([payload]);

      if (insertError) {
        setStatus("Saving track failed: " + insertError.message, true);
        return;
      }
    }

    els.form.trackFileInput.value = "";

    if (isNewFile) {
      setStatus("Track updated successfully. Because you uploaded a new file, it is now pending admin approval again.");
    } else {
      setStatus("Track saved successfully.");
    }

    await refreshPageState();

    const artistUrl = `artist.html?user_id=${encodeURIComponent(state.currentUser.id)}`;
    setTimeout(() => {
      window.location.href = artistUrl;
    }, 500);
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Something went wrong while saving your track.", true);
  } finally {
    els.form.saveTrackBtn.disabled = false;
  }
}

function handleTrackFileChange() {
  const file = els.form.trackFileInput.files[0];
  stopPreviewPlayback();

  if (state.previewObjectUrl) {
    URL.revokeObjectURL(state.previewObjectUrl);
    state.previewObjectUrl = null;
  }

  if (!file) {
    if (state.currentTrackData?.file_url) {
      loadPreviewSource(
        state.currentTrackData.file_url,
        Number(state.currentTrackData.preview_start_seconds || 0)
      );
    } else {
      setHidden(els.clip.clipTool, true);
      setHidden(els.clip.clipToolPlaceholder, false);
      setText(els.clip.clipToolPlaceholder, "Upload or load a track first to choose your 60 second radio preview.");
    }
    return;
  }

  state.previewObjectUrl = URL.createObjectURL(file);
  loadPreviewSource(state.previewObjectUrl, 0);
}

function handleClipSliderInput() {
  state.previewStartSeconds = Number(els.clip.clipStartSlider.value || 0);
  stopPreviewPlayback();
  updateClipUi();
}

async function handleClipPlay() {
  if (!els.clip.previewAudio.src || !state.previewTrackDuration) return;

  const start = Math.max(0, Math.floor(state.previewStartSeconds || 0));
  const duration = Math.min(60, Math.max(1, Math.floor(state.previewTrackDuration)));
  const end = Math.min(start + duration, state.previewTrackDuration);

  try {
    if (!els.clip.previewAudio.paused) {
      stopPreviewPlayback();
      return;
    }

    els.clip.previewAudio.currentTime = start;
    await els.clip.previewAudio.play();
    setText(els.clip.clipPlayBtn, "Stop Preview");

    state.previewPlayTimer = setInterval(() => {
      const elapsed = Math.max(0, els.clip.previewAudio.currentTime - start);
      const total = Math.max(1, end - start);
      const percent = Math.min((elapsed / total) * 100, 100);

      els.clip.clipProgressFill.style.width = `${percent}%`;
      setText(els.clip.clipCurrentTime, formatTime(elapsed));

      if (els.clip.previewAudio.currentTime >= end) {
        stopPreviewPlayback();
      }
    }, 120);
  } catch (err) {
    console.error(err);
    setStatus("The preview clip could not be played.", true);
    stopPreviewPlayback();
  }
}

function bindEvents() {
  els.header.showLoginBtn.onclick = () => {
    closeHeaderPanels();
  };

  els.header.headerAvatarBtn.onclick = () => {
    
    handleHeaderAvatarAction(els.header.accountProfileLink?.href || "artist.html");
  };

  if (els.header.accountProfileLink) {
    els.header.accountProfileLink.onclick = () => {
      setHidden(els.header.accountMenu, true);
    };
  }

  if (els.header.accountNotificationsLink) {
    els.header.accountNotificationsLink.onclick = () => {
      setHidden(els.header.accountMenu, true);
    };
  }

  els.header.logoutBtn.onclick = handleLogout;
  els.desktopNav.logoutBtn.onclick = handleLogout;
  els.form.saveTrackBtn.onclick = handleSaveTrack;

  document.querySelectorAll('input[name="aiUsage"]').forEach((input) => {
    input.addEventListener("change", updateAiDetailsVisibility);
  });

  els.form.trackFileInput.addEventListener("change", handleTrackFileChange);
  if (els.form.feelingsToggleBtn) {
    els.form.feelingsToggleBtn.addEventListener("click", () => {
      els.form.feelingsDropdownMenu.classList.toggle("hidden");
      els.form.feelingsToggleBtn.setAttribute("aria-expanded", String(!els.form.feelingsDropdownMenu.classList.contains("hidden")));
    });
  }
  els.clip.clipStartSlider.addEventListener("input", handleClipSliderInput);
  els.clip.clipPlayBtn.addEventListener("click", handleClipPlay);
  els.clip.previewAudio.addEventListener("ended", stopPreviewPlayback);

  document.addEventListener("click", (e) => {
    const insideHeaderRight = e.target.closest(".header-right");
    const isAvatarButton = e.target.closest("#headerAvatarBtn");
    const insideFeelingsDropdown = e.target.closest("#feelingsDropdown");

    if (!insideHeaderRight && !isAvatarButton) {
      setHidden(els.header.accountMenu, true);
    }

    if (!insideFeelingsDropdown && els.form.feelingsDropdownMenu) {
      els.form.feelingsDropdownMenu.classList.add("hidden");
      els.form.feelingsToggleBtn?.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setHidden(els.header.accountMenu, true);
    }
  });

  supabaseClient.auth.onAuthStateChange(() => {
    refreshPageState().catch((err) => {
      console.error(err);
      setStatus("The page could not be refreshed correctly.", true);
    });
  });
}

async function initPage() {
  applyRuntimeCurrencySnapshot();

  populateGenreSelects();
  renderFeelingOptions([]);
  setLoggedOutView();
  setPageMode(null);
  setStatus("");
  updateAiDetailsVisibility();
  bindEvents();
  await refreshPageState();
}

initPage().catch((err) => {
  console.error("initPage error:", err);
  setStatus("The page could not be loaded correctly.", true);
});
