const { getSupabaseClient, getFlagEmoji: sharedGetFlagEmoji, getProfileHref: sharedGetProfileHref, bindRuntimeCurrencySync, applyRuntimeCurrencySnapshotToElement, closeStandardHeaderPanels, setStandardHeaderAvatar, handleStandardHeaderAvatarAction, applyStandardMenuState, setStandardLoggedOutState, setStandardLoggedInState, bindStandardHeaderEvents, getCurrentUserSafe } = window.SSFMApp;
const supabaseClient = getSupabaseClient();


function getFlagEmoji(countryName) {
  return sharedGetFlagEmoji(countryName);
}

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
    artistPhoto: document.getElementById("artistPhoto"),
    artistPhotoFallback: document.getElementById("artistPhotoFallback"),
    artistName: document.getElementById("artistName"),
    artistMeta: document.getElementById("artistMeta"),
    artistBio: document.getElementById("artistBio"),
    socialLinkBtn: document.getElementById("socialLinkBtn"),
    editProfileBtn: document.getElementById("editProfileBtn"),
    submitTrackBtn: document.getElementById("submitTrackBtn"),
    submissionTitle: document.getElementById("submissionTitle"),
    artistStatus: document.getElementById("artistStatus"),
    tracksWrap: document.getElementById("tracksWrap"),
    noTracksBox: document.getElementById("noTracksBox")
  }
};

const state = {
  currentProfileData: null,
  currentTrackData: null,
  viewedArtistUserId: null,
  currentUserId: null,
  currentAudio: null,
  currentAudioButton: null,
  currentProgressBar: null,
  currentTimeLabel: null,
  currentPreviewInterval: null
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getArtistUserIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user_id");
}

function setArtistStatus(message = "", isError = false) {
  if (!message) {
    setHidden(els.page.artistStatus, true);
    setText(els.page.artistStatus, "");
    els.page.artistStatus.classList.remove("error");
    return;
  }

  setHidden(els.page.artistStatus, false);
  setText(els.page.artistStatus, message);
  els.page.artistStatus.classList.toggle("error", isError);
}

function closeHeaderPanels() {
  closeStandardHeaderPanels(els);
}

function setHeaderAvatar(photoUrl, artistName) {
  setStandardHeaderAvatar(els, photoUrl, artistName);
}


function applyRuntimeCurrencySnapshot() {
  applyRuntimeCurrencySnapshotToElement(els.header?.currencyValue, els.header?.currencyBadge);
}

bindRuntimeCurrencySync(els.header?.currencyValue, els.header?.currencyBadge);

function getProfileHref(profile) {
  return sharedGetProfileHref(profile);
}


function handleHeaderAvatarAction(profileHref) {
  handleStandardHeaderAvatarAction(els, profileHref);
}

function applyMenuState(user, profile, track) {
  applyStandardMenuState(els, user, profile, track);
}

function setLoggedOutHeader() {
  setStandardLoggedOutState(els);
  state.currentUserId = null;
  state.currentProfileData = null;
  state.currentTrackData = null;
  applyMenuState(null, null, null);
}

function setLoggedInHeader() {
  setStandardLoggedInState(els, { coins: state.currentProfileData?.coins || 0 });
}

async function handleLogout() {
  els.header.logoutBtn.disabled = true;
  els.desktopNav.logoutBtn.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      setArtistStatus("Logout failed: " + error.message, true);
      return;
    }

    window.location.href = "index.html";
  } catch (err) {
    console.error(err);
    setArtistStatus("Logout failed. Try again.", true);
  } finally {
    els.header.logoutBtn.disabled = false;
    els.desktopNav.logoutBtn.disabled = false;
  }
}

async function loadCurrentUserState() {
  const { data, error } = await supabaseClient.auth.getSession();
  const user = error ? null : data?.session?.user || null;

  if (!user) {
    setLoggedOutHeader();
    return null;
  }

  state.currentUserId = user.id;

  const profilePromise = supabaseClient
    .from("profiles")
    .select("user_id, artist_name, photo_url, bio, nationality, social_link, created_at, date_of_birth, coins")
    .eq("user_id", user.id)
    .maybeSingle();

  const trackPromise = supabaseClient
    .from("tracks")
    .select("id, user_id, title, status, created_at, preview_start_seconds, preview_duration_seconds")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: profileData }, { data: trackData }] = await Promise.all([profilePromise, trackPromise]);

  state.currentProfileData = profileData || null;
  state.currentTrackData = trackData || null;

  setLoggedInHeader();
  setCurrency(state.currentProfileData?.coins || 0);
  setHeaderAvatar(state.currentProfileData?.photo_url || "", state.currentProfileData?.artist_name || "A");
  applyMenuState(user, state.currentProfileData, state.currentTrackData);

  return user;
}

async function fetchArtistProfile(userId) {
  const { data, error } = await supabaseClient
    .from("public_artist_profiles")
    .select("user_id, artist_name, photo_url, bio, social_link, nationality, created_at, date_of_birth, music_roles, city")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load artist profile: " + error.message);
  }

  return data || null;
}

async function fetchApprovedTracks(userId) {
  const { data, error } = await supabaseClient
    .from("tracks")
    .select("id, title, artist, file_url, created_at, status, user_id, preview_start_seconds, preview_duration_seconds, genre_primary, genre_secondary, feeling_tags, artist_page_full_track")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Could not load approved track: " + error.message);
  }

  return data || [];
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

function getMemberSinceDisplay(rawValue) {
  if (!rawValue) return "—";

  const parsed = new Date(rawValue);

  if (!Number.isNaN(parsed.getTime())) {
    const month = parsed.toLocaleDateString("en-GB", {
      month: "short",
      timeZone: "UTC"
    });

    const year = parsed.toLocaleDateString("en-GB", {
      year: "numeric",
      timeZone: "UTC"
    });

    return `${month} ${year}`;
  }

  const raw = String(rawValue).trim();

  if (raw.length >= 7) {
    const year = raw.slice(0, 4);
    const monthNum = raw.slice(5, 7);

    const monthMap = {
      "01": "Jan",
      "02": "Feb",
      "03": "Mar",
      "04": "Apr",
      "05": "May",
      "06": "Jun",
      "07": "Jul",
      "08": "Aug",
      "09": "Sep",
      "10": "Oct",
      "11": "Nov",
      "12": "Dec"
    };

    if (monthMap[monthNum] && /^\d{4}$/.test(year)) {
      return `${monthMap[monthNum]} ${year}`;
    }
  }

  return "—";
}

function getBirthdayDisplay(rawValue) {
  if (!rawValue) return "";

  const parsed = new Date(rawValue);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      timeZone: "UTC"
    });
  }

  const raw = String(rawValue).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    const [, , monthNum, dayNum] = match;
    const monthMap = {
      "01": "January",
      "02": "February",
      "03": "March",
      "04": "April",
      "05": "May",
      "06": "June",
      "07": "July",
      "08": "August",
      "09": "September",
      "10": "October",
      "11": "November",
      "12": "December"
    };

    if (monthMap[monthNum]) {
      return `${Number(dayNum)} ${monthMap[monthNum]}`;
    }
  }

  return "";
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}


function pauseSharedRadioPlayback() {
  try {
    const raw = localStorage.getItem("ssfm_radio_session_v2");
    const session = raw ? JSON.parse(raw) : {};
    session.desiredPlaying = false;
    session.isPlaying = false;
    session.lastUpdatedAt = Date.now();
    localStorage.setItem("ssfm_radio_session_v2", JSON.stringify(session));
  } catch {}

  if (typeof window.__ssfmPauseMiniRadio === "function") {
    window.__ssfmPauseMiniRadio();
  }

  if (typeof window.__ssfmPauseMainRadio === "function") {
    window.__ssfmPauseMainRadio();
  }
}

function stopCurrentAudio() {
  if (state.currentPreviewInterval) {
    clearInterval(state.currentPreviewInterval);
    state.currentPreviewInterval = null;
  }

  if (state.currentAudio) {
    state.currentAudio.pause();
  }

  if (state.currentAudioButton) {
    state.currentAudioButton.textContent = "▶";
  }

  if (state.currentProgressBar) {
    state.currentProgressBar.style.width = "0%";
  }

  if (state.currentTimeLabel) {
    state.currentTimeLabel.textContent = "0:00";
  }

  state.currentAudio = null;
  state.currentAudioButton = null;
  state.currentProgressBar = null;
  state.currentTimeLabel = null;
}

function renderArtistProfile(profile, isOwnPage, hasOwnTrack) {
  const displayName = profile?.artist_name || "Unknown Artist";

  setText(els.page.artistName, displayName);
  setText(els.page.submissionTitle, "Tune");

  if (profile?.photo_url) {
    els.page.artistPhoto.src = profile.photo_url;
    setHidden(els.page.artistPhoto, false);
    setHidden(els.page.artistPhotoFallback, true);
  } else {
    setHidden(els.page.artistPhoto, true);
    setHidden(els.page.artistPhotoFallback, false);
    setText(els.page.artistPhotoFallback, displayName.charAt(0).toUpperCase());
  }

  els.page.artistMeta.innerHTML = "";
  setHidden(els.page.artistMeta, false);

  if (profile?.nationality) {
    const nationalityPill = document.createElement("div");
    nationalityPill.className = "meta-pill";
    nationalityPill.textContent = getFlagEmoji(profile.nationality) || profile.nationality;
    els.page.artistMeta.appendChild(nationalityPill);
  }

  const profileRoles = Array.isArray(profile?.music_roles) && profile.music_roles.length
    ? profile.music_roles
    : (profile?.music_role ? [profile.music_role] : []);

  if (profileRoles.length && !profileRoles.includes('none')) {
    const rolePill = document.createElement("div");
    rolePill.className = "meta-pill";
    rolePill.textContent = profileRoles.map((role) => role.charAt(0).toUpperCase() + role.slice(1)).join(" · ");
    els.page.artistMeta.appendChild(rolePill);
  }

  if (profile?.city) {
    const cityPill = document.createElement("div");
    cityPill.className = "meta-pill";
    cityPill.textContent = profile.city;
    els.page.artistMeta.appendChild(cityPill);
  }

  const memberSincePill = document.createElement("div");
  memberSincePill.className = "meta-pill member-since-pill";
  memberSincePill.textContent = `Member since ${getMemberSinceDisplay(profile?.created_at)}`;
  els.page.artistMeta.appendChild(memberSincePill);

  const birthdayDisplay = getBirthdayDisplay(profile?.date_of_birth);
  if (birthdayDisplay) {
    const birthdayPill = document.createElement("div");
    birthdayPill.className = "meta-pill birthday-pill";
    birthdayPill.innerHTML = `<span class="birthday-icon" aria-hidden="true">🎂</span><span>${escapeHtml(birthdayDisplay)}</span>`;
    els.page.artistMeta.appendChild(birthdayPill);
  }

  if (els.page.artistMeta.children.length === 0) {
    setHidden(els.page.artistMeta, true);
  }

  if (profile?.bio) {
    setText(els.page.artistBio, profile.bio);
    setHidden(els.page.artistBio, false);
  } else {
    setHidden(els.page.artistBio, true);
    setText(els.page.artistBio, "");
  }

  if (profile?.social_link) {
    els.page.socialLinkBtn.href = profile.social_link;
    setHidden(els.page.socialLinkBtn, false);
  } else {
    els.page.socialLinkBtn.href = "#";
    setHidden(els.page.socialLinkBtn, true);
  }

  setHidden(els.page.editProfileBtn, !isOwnPage || !state.currentProfileData);

  if (isOwnPage && state.currentProfileData) {
    setHidden(els.page.submitTrackBtn, false);
    setText(els.page.submitTrackBtn, state.currentTrackData ? "Edit Your Track" : "Submit Your Track");
    els.page.submitTrackBtn.href = "submit-track.html";
  } else {
    setHidden(els.page.submitTrackBtn, true);
  }
}

function buildTrackCard(track) {
  const card = document.createElement("article");
  card.className = "track-card";

  const createdAtLabel = formatDate(track.created_at);
  const previewStart = Math.max(0, Number(track.preview_start_seconds || 0));
  const previewDuration = Math.max(1, Math.min(60, Number(track.preview_duration_seconds || 60)));
  const allowFullTrack = Boolean(track.artist_page_full_track);
  const genrePills = [];

  if (track.genre_primary) genrePills.push(track.genre_primary);
  if (track.genre_secondary) genrePills.push(track.genre_secondary);

  const feelingTags = Array.isArray(track.feeling_tags) ? track.feeling_tags : [];

  card.innerHTML = `
    <div class="track-top">
      <div>
        <div class="track-title">${escapeHtml(track.title || "Untitled Track")}</div>
        <div class="track-subtitle">${escapeHtml(track.artist || "Artist")}</div>
      </div>
      <div class="track-status">${allowFullTrack ? "Full track" : `${formatTime(previewDuration)} tune`}</div>
    </div>

    <div class="track-player">
      <div class="player-row">
        <button class="player-btn" type="button" aria-label="Play preview">▶</button>
        <div class="progress-wrap">
          <div class="progress-bar"></div>
        </div>
        <div class="player-time">0:00</div>
      </div>

      <div class="track-meta-row">
        <div class="mini-pill">${allowFullTrack ? "Playback: Full track" : `Preview: ${formatTime(previewStart)} - ${formatTime(previewStart + previewDuration)}`}</div>
        ${createdAtLabel ? `<div class="mini-pill">Submitted: ${escapeHtml(createdAtLabel)}</div>` : ""}
        ${genrePills.map((genre) => `<div class="mini-pill">Genre: ${escapeHtml(genre)}</div>`).join("")}
        ${feelingTags.map((tag) => `<div class="mini-pill">#${escapeHtml(tag)}</div>`).join("")}
      </div>
    </div>
  `;

  const playBtn = card.querySelector(".player-btn");
  const progressBar = card.querySelector(".progress-bar");
  const timeLabel = card.querySelector(".player-time");

  const audio = new Audio(track.file_url);
  audio.preload = "metadata";

  playBtn.addEventListener("click", async () => {
    try {
      if (state.currentAudio && state.currentAudio !== audio) {
        stopCurrentAudio();
      }

      if (!audio.paused && state.currentAudio === audio) {
        stopCurrentAudio();
        return;
      }

      stopCurrentAudio();
      pauseSharedRadioPlayback();

      state.currentAudio = audio;
      state.currentAudioButton = playBtn;
      state.currentProgressBar = progressBar;
      state.currentTimeLabel = timeLabel;

      const playbackStart = allowFullTrack ? 0 : previewStart;
      audio.currentTime = playbackStart;
      await audio.play();
      playBtn.textContent = "❚❚";

      state.currentPreviewInterval = setInterval(() => {
        const elapsed = Math.max(0, audio.currentTime - playbackStart);
        const activeDuration = allowFullTrack
          ? Math.max(1, Math.floor(audio.duration || 0))
          : previewDuration;
        const percent = Math.min((elapsed / activeDuration) * 100, 100);

        progressBar.style.width = `${percent}%`;
        timeLabel.textContent = formatTime(elapsed);

        if (!allowFullTrack && audio.currentTime >= previewStart + previewDuration) {
          stopCurrentAudio();
        }
      }, 120);
    } catch (err) {
      console.error(err);
      setArtistStatus("Preview could not be played.", true);
      stopCurrentAudio();
    }
  });

  audio.addEventListener("ended", () => {
    if (state.currentAudio === audio) {
      stopCurrentAudio();
    }
  });

  return card;
}

function resetArtistPageShell() {
  setArtistStatus("");
  setHidden(els.page.tracksWrap, true);
  setHidden(els.page.noTracksBox, true);
  els.page.tracksWrap.innerHTML = "";
  setText(els.page.submissionTitle, "Tune");
}

async function loadViewedArtistPage(userId) {
  state.viewedArtistUserId = userId;

  if (!userId) {
    setText(els.page.artistName, "Artist not found");
    setText(els.page.submissionTitle, "Tune");
    setHidden(els.page.noTracksBox, true);
    setHidden(els.page.tracksWrap, true);
    setArtistStatus("No artist user_id was provided in the URL.", true);
    return;
  }

  resetArtistPageShell();

  let profile;
  try {
    profile = await fetchArtistProfile(userId);
  } catch (err) {
    setText(els.page.artistName, "Artist not found");
    setArtistStatus(err.message || "Could not load artist profile.", true);
    return;
  }

  if (!profile) {
    setText(els.page.artistName, "Artist not found");
    setArtistStatus("This artist profile does not exist.", true);
    return;
  }

  const isOwnPage = Boolean(state.currentUserId && state.currentUserId === userId);
  const hasOwnTrack = Boolean(state.currentTrackData);

  renderArtistProfile(profile, isOwnPage, hasOwnTrack);

  let approvedTracks;
  try {
    approvedTracks = await fetchApprovedTracks(userId);
  } catch (err) {
    setArtistStatus(err.message || "Could not load approved track.", true);
    return;
  }

  if (!approvedTracks.length) {
    setHidden(els.page.noTracksBox, false);
    setHidden(els.page.tracksWrap, true);
    return;
  }

  els.page.tracksWrap.innerHTML = "";
  approvedTracks.forEach((track) => {
    els.page.tracksWrap.appendChild(buildTrackCard(track));
  });

  setHidden(els.page.tracksWrap, false);
  setHidden(els.page.noTracksBox, true);
}

async function refreshWholePage() {
  resetArtistPageShell();

  const userPromise = loadCurrentUserState();
  const urlUserId = getArtistUserIdFromUrl();

  if (urlUserId) {
    await userPromise;
    await loadViewedArtistPage(urlUserId);
    return;
  }

  const user = await userPromise;

  if (user && state.currentProfileData?.user_id) {
    await loadViewedArtistPage(state.currentProfileData.user_id);
    return;
  }

  setText(els.page.artistName, "Artist not found");
  setArtistStatus("No artist user_id was provided in the URL.", true);
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

  document.addEventListener("click", (e) => {
    const insideHeaderRight = e.target.closest(".header-right");
    const isAvatarButton = e.target.closest("#headerAvatarBtn");

    if (!insideHeaderRight && !isAvatarButton) {
      setHidden(els.header.accountMenu, true);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setHidden(els.header.accountMenu, true);
    }
  });

  supabaseClient.auth.onAuthStateChange(() => {
    refreshWholePage().catch((err) => {
      console.error(err);
      setArtistStatus("The page could not be refreshed correctly.", true);
    });
  });
}

async function initPage() {
  applyRuntimeCurrencySnapshot();

  bindEvents();
  await refreshWholePage();
}

initPage().catch((err) => {
  console.error("initPage error:", err);
  setArtistStatus("The page could not be loaded correctly.", true);
});
