const supabaseClient = window.supabase.createClient(
  "https://rgoutegbcpjytplqcwze.supabase.co",
  "sb_publishable_255qyDKS77nMU0pbedfa_A_3hdgtEHh"
);

const DAILY_SECONDS_LIMIT = 10;
const SKIP_COST = 1;

const els = {
  showLoginBtn: document.getElementById("showLoginBtn"),
  headerAvatarBtn: document.getElementById("headerAvatarBtn"),
  headerAvatarImage: document.getElementById("headerAvatarImage"),
  headerAvatarFallback: document.getElementById("headerAvatarFallback"),
  accountMenu: document.getElementById("accountMenu"),
  accountProfileLink: document.getElementById("accountProfileLink"),
  accountNotificationsLink: document.getElementById("accountNotificationsLink"),

  currencyBadge: document.getElementById("currencyBadge"),
  currencyValue: document.getElementById("currencyValue"),

  desktopLoginLink: document.getElementById("desktopLoginLink"),
  desktopLogoutBtn: document.getElementById("desktopLogoutBtn"),
  desktopProfileLink: document.getElementById("desktopProfileLink"),
  desktopNotificationsLink: document.getElementById("desktopNotificationsLink"),
  desktopTrackLink: document.getElementById("desktopTrackLink"),

  mobileLoginLink: document.getElementById("mobileLoginLink"),
  mobileProfileLink: document.getElementById("mobileProfileLink"),
  mobileNotificationsLink: document.getElementById("mobileNotificationsLink"),
  mobileTrackLink: document.getElementById("mobileTrackLink"),

  logoutBtn: document.getElementById("logout"),
  submitTrackBtn: document.getElementById("submitTrackBtn"),
  joinBtn: document.getElementById("joinBtn"),

  audio: document.getElementById("audio"),
  startBtn: document.getElementById("start"),
  startOverlay: document.getElementById("startOverlay"),
  radioShell: document.getElementById("radioShell"),
  titleEl: document.getElementById("title"),
  artistWrapEl: document.getElementById("artistWrap"),
  likeBtn: document.getElementById("likeBtn"),
  skipBtn: document.getElementById("skip"),
  featureNoteEl: document.getElementById("featureNote"),
  conceptSectionEl: document.getElementById("conceptSection"),
  volume: document.getElementById("volume"),
  volumeBtn: document.getElementById("volumeBtn"),
  volumeControl: document.getElementById("volumeControl"),
  progressFill: document.getElementById("progress"),
  elapsedTimeEl: document.getElementById("elapsedTime"),
  durationTimeEl: document.getElementById("durationTime"),
  listenersCountEl: document.getElementById("listenersCount"),
  submittedCountEl: document.getElementById("submittedCount"),
  submittedCardEl: document.getElementById("submittedCard"),
  playsPerDayEl: document.getElementById("playsPerDay"),
  playsCardEl: document.getElementById("playsCard"),
  myPlaysCardEl: document.getElementById("myPlaysCard"),
  myTotalPlaysEl: document.getElementById("myTotalPlays"),

  earnSecondsWrap: document.getElementById("earnSecondsWrap"),
  earnSecondsProgress: document.getElementById("earnSecondsProgress"),
  earnSecondsCopy: document.getElementById("earnSecondsCopy")
};

const state = {
  tracks: [],
  current: -1,
  liked: false,
  listenerIdentity: null,
  isLiveActivated: false,
  liveBooted: false,
  currentProfileData: null,
  currentTrackData: null,
  currentPreviewStart: 0,
  currentPreviewDuration: 60,
  currentUser: null,
  currentCoins: 0,
  dailySecondsEarned: 0,
  dailySecondsEarnedDate: null,
  trackAdvanceLock: false
};

const REFRESH_INTERVALS = {
  listenerHeartbeat: 15000,
  listenerCount: 10000,
  tracksReload: 30000
};

function setHidden(el, hidden) {
  if (!el) return;
  el.classList.toggle("hidden", hidden);
}

function setText(el, value) {
  if (!el) return;
  el.textContent = value;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTrackPreviewStart(track) {
  const value = Number(track?.preview_start_seconds);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function getTrackPreviewDuration(track) {
  const value = Number(track?.preview_duration_seconds);
  return Number.isFinite(value) && value > 0 ? value : 60;
}

function getProfileCoins(profile) {
  const value = Number(profile?.coins);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDailySecondsState(profile) {
  const today = getTodayDateKey();
  const profileDate = profile?.daily_seconds_earned_date || null;
  const profileCount = Number(profile?.daily_seconds_earned);

  if (profileDate === today) {
    state.dailySecondsEarnedDate = today;
    state.dailySecondsEarned = Number.isFinite(profileCount) && profileCount >= 0 ? profileCount : 0;
    return;
  }

  state.dailySecondsEarnedDate = today;
  state.dailySecondsEarned = 0;
}

function updateJoinButtonHref() {
  if (!els.joinBtn) return;
  els.joinBtn.href = "login.html";
}

function setCurrency(value = 0) {
  state.currentCoins = Number(value) || 0;
  setText(els.currencyValue, formatNumber(state.currentCoins));
  updateSkipButtonState();
}

function updateCurrencyVisibility(user) {
  setHidden(els.currencyBadge, !user);
}

function updateConceptVisibility() {
  const shouldShow = !state.currentUser && state.isLiveActivated;
  setHidden(els.conceptSectionEl, !shouldShow);
  updateJoinButtonHref();
}

function hideUserStats() {
  setHidden(els.submittedCardEl, true);
  setHidden(els.playsCardEl, true);
  setHidden(els.myPlaysCardEl, true);
  setText(els.submittedCountEl, "0");
  setText(els.playsPerDayEl, "0");
  setText(els.myTotalPlaysEl, "0");
}

function updateVolumeButtonState() {
  const isMuted = els.audio.muted || Number(els.audio.volume) === 0;
  els.volumeBtn.classList.toggle("muted", isMuted);
  els.volumeBtn.setAttribute("aria-label", isMuted ? "Volume muted" : "Volume");
}

function closeHeaderPanels() {
  setHidden(els.accountMenu, true);
  els.volumeControl.classList.remove("open");
}

function getProfileHref(profile) {
  if (!profile) return "join.html";
  if (profile.user_id) {
    return `artist.html?user_id=${encodeURIComponent(profile.user_id)}`;
  }
  return "join.html";
}

function resetLike() {
  state.liked = false;
  els.likeBtn.innerHTML = `<span class="icon">♥</span>Like`;
  els.likeBtn.classList.remove("liked");
}

function updateEarnSecondsProgress() {
  if (!els.earnSecondsProgress) return;

  const safeCurrent = Math.max(0, Number(state.dailySecondsEarned) || 0);
  const safeLimit = Math.max(1, Number(DAILY_SECONDS_LIMIT) || 1);
  const percentage = Math.min((safeCurrent / safeLimit) * 100, 100);

  els.earnSecondsProgress.style.width = `${percentage}%`;

  if (els.earnSecondsCopy) {
    els.earnSecondsCopy.textContent = `Earn Seconds by listening the entire tune · ${safeCurrent}/${safeLimit} today`;
  }
}

function updateEarnSecondsVisibility() {
  const shouldShow = Boolean(state.currentUser);
  setHidden(els.earnSecondsWrap, !shouldShow);
}

function updateSkipButtonState() {
  const isLoggedIn = Boolean(state.currentUser);
  const hasCoins = state.currentCoins >= SKIP_COST;
  if (els.skipBtn) {
    els.skipBtn.disabled = !isLoggedIn || !hasCoins;
  }
}

function updateInteractiveControls() {
  const isLoggedIn = Boolean(state.currentUser);

  els.likeBtn.disabled = !isLoggedIn;
  setHidden(els.featureNoteEl, isLoggedIn);
  updateConceptVisibility();
  updateEarnSecondsVisibility();
  updateSkipButtonState();
  updateEarnSecondsProgress();

  if (!isLoggedIn) {
    resetLike();
  }
}

function applyMenuState(user, profile, track) {
  const isLoggedIn = Boolean(user);
  const hasProfile = Boolean(profile);
  const hasTrack = Boolean(track);
  const profileHref = getProfileHref(profile);

  setHidden(els.desktopLoginLink, isLoggedIn);
  setHidden(els.mobileLoginLink, isLoggedIn);
  setHidden(els.desktopLogoutBtn, !isLoggedIn);

  setHidden(els.desktopProfileLink, !isLoggedIn);
  setHidden(els.mobileProfileLink, !isLoggedIn);

  setHidden(els.desktopNotificationsLink, !isLoggedIn);
  setHidden(els.mobileNotificationsLink, !isLoggedIn);

  setHidden(els.desktopTrackLink, !isLoggedIn || !hasProfile);
  setHidden(els.mobileTrackLink, !isLoggedIn || !hasProfile);

  els.desktopProfileLink.href = profileHref;
  els.mobileProfileLink.href = profileHref;
  els.accountProfileLink.href = profileHref;

  setHidden(els.accountProfileLink, !isLoggedIn);

  els.desktopTrackLink.setAttribute("data-track-mode", hasTrack ? "edit" : "submit");
  els.mobileTrackLink.setAttribute("data-track-mode", hasTrack ? "edit" : "submit");

  els.submitTrackBtn.textContent = "Tune";
  updateJoinButtonHref();
}

function setHeaderAvatar(photoUrl, artistName) {
  if (photoUrl) {
    els.headerAvatarImage.src = photoUrl;
    setHidden(els.headerAvatarImage, false);
    setHidden(els.headerAvatarFallback, true);
    return;
  }

  setHidden(els.headerAvatarImage, true);
  setHidden(els.headerAvatarFallback, false);
  els.headerAvatarFallback.textContent = (artistName || "A").charAt(0).toUpperCase();
}

function setLoggedOutView() {
  closeHeaderPanels();

  setHidden(els.submitTrackBtn, true);
  setHidden(els.showLoginBtn, false);
  setHidden(els.headerAvatarBtn, true);
  setHidden(els.headerAvatarImage, true);
  setHidden(els.headerAvatarFallback, true);

  els.headerAvatarImage.src = "";
  setHidden(els.accountProfileLink, true);
  els.accountProfileLink.href = "javascript:void(0)";

  state.currentProfileData = null;
  state.currentTrackData = null;
  state.currentUser = null;
  state.currentCoins = 0;
  state.dailySecondsEarned = 0;
  state.dailySecondsEarnedDate = null;
  state.listenerIdentity = null;
  state.trackAdvanceLock = false;

  applyMenuState(null, null, null);
  hideUserStats();
  updateInteractiveControls();
  updateCurrencyVisibility(null);
  setCurrency(0);
  updateJoinButtonHref();
}

function setLoggedInView() {
  setHidden(els.submitTrackBtn, true);
  setHidden(els.showLoginBtn, true);
  setHidden(els.headerAvatarBtn, false);
  updateCurrencyVisibility(state.currentUser || true);
}

async function getSessionUser() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data?.session?.user || null;
}

async function loadMyProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("artist_name, photo_url, user_id, coins, daily_seconds_earned, daily_seconds_earned_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    state.currentProfileData = null;
    state.currentCoins = 0;
    state.dailySecondsEarned = 0;
    state.dailySecondsEarnedDate = getTodayDateKey();
    setHeaderAvatar("", "•");
    setCurrency(0);
    updateEarnSecondsProgress();
    return null;
  }

  state.currentProfileData = data;
  state.currentCoins = getProfileCoins(data);
  normalizeDailySecondsState(data);

  setHeaderAvatar(data.photo_url, data.artist_name);
  setCurrency(state.currentCoins);
  updateEarnSecondsProgress();

  return data;
}

async function loadMyTune(userId) {
  const { data, error } = await supabaseClient
    .from("tracks")
    .select("id, user_id, title, status, created_at")
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

async function refreshCoins() {
  if (!state.currentUser) {
    state.currentCoins = 0;
    state.dailySecondsEarned = 0;
    state.dailySecondsEarnedDate = null;
    setCurrency(0);
    updateEarnSecondsProgress();
    return 0;
  }

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("coins, daily_seconds_earned, daily_seconds_earned_date")
    .eq("user_id", state.currentUser.id)
    .maybeSingle();

  if (error || !data) {
    console.error("refreshCoins error:", error);
    state.currentCoins = 0;
    state.dailySecondsEarned = 0;
    state.dailySecondsEarnedDate = getTodayDateKey();
    setCurrency(0);
    updateEarnSecondsProgress();
    return 0;
  }

  state.currentCoins = getProfileCoins(data);
  normalizeDailySecondsState(data);
  setCurrency(state.currentCoins);
  updateEarnSecondsProgress();
  return state.currentCoins;
}

async function awardListeningSecond() {
  if (!state.currentUser) return false;

  const { data, error } = await supabaseClient.rpc("award_listening_second_v2", {});

  if (error || !data) {
    console.error("awardListeningSecond error:", error);
    return false;
  }

  if (!data.success) {
    if (typeof data.coins !== "undefined") {
      setCurrency(data.coins);
    }
    if (typeof data.daily_seconds_earned !== "undefined") {
      state.dailySecondsEarned = Number(data.daily_seconds_earned) || 0;
      state.dailySecondsEarnedDate = getTodayDateKey();
      updateEarnSecondsProgress();
    }
    return false;
  }

  state.currentCoins = Number(data.coins) || 0;
  state.dailySecondsEarned = Number(data.daily_seconds_earned) || 0;
  state.dailySecondsEarnedDate = getTodayDateKey();

  setCurrency(state.currentCoins);
  updateEarnSecondsProgress();
  return true;
}

async function refreshAuthUI() {
  try {
    const user = await getSessionUser();
    state.currentUser = user;

    if (!user) {
      setLoggedOutView();
      return null;
    }

    updateCurrencyVisibility(user);
    setCurrency(state.currentCoins || 0);
    setLoggedInView();

    const [profile, tune] = await Promise.all([
      loadMyProfile(user.id),
      loadMyTune(user.id)
    ]);

    applyMenuState(user, profile, tune);
    updateInteractiveControls();
    updateJoinButtonHref();
    return user;
  } catch (err) {
    console.error("refreshAuthUI error:", err);
    setLoggedOutView();
    return null;
  }
}

async function loadTrackStats() {
  try {
    const user = await getSessionUser();

    if (!user) {
      setHidden(els.submittedCardEl, true);
      setHidden(els.playsCardEl, true);
      return;
    }

    const [
      { count: submittedCount },
      { count: approvedCount },
      { count: myApproved }
    ] = await Promise.all([
      supabaseClient.from("tracks").select("*", { count: "exact", head: true }),
      supabaseClient.from("tracks").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabaseClient.from("tracks").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "approved")
    ]);

    setHidden(els.submittedCardEl, false);
    setText(els.submittedCountEl, formatNumber(submittedCount));

    if (!myApproved || myApproved === 0) {
      setHidden(els.playsCardEl, true);
      return;
    }

    const perDay = approvedCount && approvedCount > 0
      ? Math.floor(1440 / approvedCount)
      : 0;

    setHidden(els.playsCardEl, false);
    setText(els.playsPerDayEl, formatNumber(perDay));
  } catch (err) {
    console.error("loadTrackStats error:", err);
  }
}

async function loadMyTotalPlays() {
  try {
    const user = await getSessionUser();

    if (!user) {
      setHidden(els.myPlaysCardEl, true);
      return;
    }

    const { data: myTracks, error } = await supabaseClient
      .from("tracks")
      .select("play_count")
      .eq("user_id", user.id);

    if (error || !myTracks || myTracks.length === 0) {
      setHidden(els.myPlaysCardEl, true);
      return;
    }

    const total = myTracks.reduce((sum, track) => sum + (track.play_count || 0), 0);

    setHidden(els.myPlaysCardEl, false);
    setText(els.myTotalPlaysEl, formatNumber(total));
  } catch (err) {
    console.error("loadMyTotalPlays error:", err);
  }
}

async function refreshAuthDependentUI() {
  await refreshAuthUI();
  await Promise.all([
    loadTrackStats(),
    loadMyTotalPlays()
  ]);
  updateJoinButtonHref();
}

async function loadTracksFromSupabase() {
  const { data, error } = await supabaseClient
    .from("tracks")
    .select("id, title, artist, file_url, user_id, play_count, status, created_at, preview_start_seconds, preview_duration_seconds")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadTracksFromSupabase error:", error);
    state.tracks = [];
    return;
  }

  state.tracks = (data || []).map(track => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    file_url: track.file_url,
    user_id: track.user_id || null,
    play_count: track.play_count || 0,
    preview_start_seconds: track.preview_start_seconds,
    preview_duration_seconds: track.preview_duration_seconds
  }));
}

function renderArtist(track) {
  if (track.user_id) {
    els.artistWrapEl.innerHTML = `
      <a class="artist-link" href="artist.html?user_id=${encodeURIComponent(track.user_id)}">
        ${escapeHtml(track.artist)}
      </a>
    `;
    return;
  }

  els.artistWrapEl.innerHTML = `<span>${escapeHtml(track.artist)}</span>`;
}

function setTrackUI(track) {
  setText(els.titleEl, track.title || "Untitled");
  renderArtist(track);

  state.currentPreviewStart = getTrackPreviewStart(track);
  state.currentPreviewDuration = getTrackPreviewDuration(track);

  setText(els.durationTimeEl, formatTime(state.currentPreviewDuration));
  setText(els.elapsedTimeEl, "0:00");
  els.progressFill.style.width = "0%";

  resetLike();
  updateEarnSecondsProgress();
}

function incrementPlayCount(track) {
  if (!track?.id) return;

  supabaseClient
    .from("tracks")
    .update({ play_count: (track.play_count || 0) + 1 })
    .eq("id", track.id)
    .then(() => {
      track.play_count = (track.play_count || 0) + 1;
    })
    .catch(err => console.error("incrementPlayCount error:", err));
}

function chooseNextTrackIndex() {
  if (!state.tracks.length) return -1;

  let next;
  do {
    next = Math.floor(Math.random() * state.tracks.length);
  } while (state.tracks.length > 1 && next === state.current);

  return next;
}

function setEmptyRadioState() {
  setText(els.titleEl, "No live tunes yet");
  els.artistWrapEl.innerHTML = `<span>Check back soon</span>`;
  els.progressFill.style.width = "0%";
  setText(els.elapsedTimeEl, "0:00");
  setText(els.durationTimeEl, "1:00");
  updateEarnSecondsProgress();
}

function playTrackAt(index, previewOffset = 0, countPlay = true) {
  const track = state.tracks[index];
  if (index < 0 || !track) return;

  state.current = index;

  const previewStart = getTrackPreviewStart(track);
  const previewDuration = getTrackPreviewDuration(track);
  const safeOffset = Math.max(0, Math.min(previewOffset, Math.max(previewDuration - 0.25, 0)));
  const targetStartTime = previewStart + safeOffset;

  setTrackUI(track);
  els.audio.src = track.file_url;
  setText(els.elapsedTimeEl, formatTime(safeOffset));
  els.progressFill.style.width = `${previewDuration > 0 ? (safeOffset / previewDuration) * 100 : 0}%`;

  els.audio.onloadedmetadata = () => {
    const maxStart = Math.max(0, (els.audio.duration || targetStartTime) - 0.25);
    const clampedStart = Math.min(targetStartTime, maxStart);

    try {
      els.audio.currentTime = clampedStart;
    } catch (e) {
      console.error("set currentTime error:", e);
    }

    const playPromise = els.audio.play();
    if (playPromise) {
      playPromise.catch(err => {
        console.log("audio play blocked:", err);
      });
    }
  };

  if (countPlay) {
    incrementPlayCount(track);
  }
}

function nextTrack(previewOffset = 0, countPlay = true) {
  if (!state.tracks.length) {
    setEmptyRadioState();
    return;
  }

  const nextIndex = chooseNextTrackIndex();
  playTrackAt(nextIndex, previewOffset, countPlay);
}

async function getListenerIdentity() {
  const user = await getSessionUser();

  if (user?.id) return user.id;

  let anonId = localStorage.getItem("listener_id");
  if (!anonId) {
    anonId = crypto.randomUUID();
    localStorage.setItem("listener_id", anonId);
  }
  return anonId;
}

async function registerListener() {
  try {
    if (!state.isLiveActivated) return;

    if (!state.listenerIdentity) {
      state.listenerIdentity = await getListenerIdentity();
    }

    const { error } = await supabaseClient
      .from("listeners")
      .upsert(
        [{
          user_id: state.listenerIdentity,
          last_seen: new Date().toISOString()
        }],
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("registerListener error:", error);
    }
  } catch (err) {
    console.error("registerListener crash:", err);
  }
}

async function updateListeners() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { count, error } = await supabaseClient
      .from("listeners")
      .select("*", { count: "exact", head: true })
      .gt("last_seen", fiveMinutesAgo);

    if (error) {
      console.error("updateListeners error:", error);
      return;
    }

    if (count !== null) {
      setText(els.listenersCountEl, `${formatNumber(count)} Listeners`);
    }
  } catch (err) {
    console.error("updateListeners crash:", err);
  }
}

async function bootstrapLiveRadio() {
  await loadTracksFromSupabase();

  if (!state.tracks.length) {
    setEmptyRadioState();
    await updateListeners();
    return;
  }

  els.audio.volume = Number(els.volume.value);
  els.audio.muted = true;
  updateVolumeButtonState();

  const nextIndex = chooseNextTrackIndex();
  if (nextIndex >= 0) {
    const previewDuration = getTrackPreviewDuration(state.tracks[nextIndex]);
    const randomLiveOffset = Math.floor(Math.random() * Math.max(previewDuration, 1));
    playTrackAt(nextIndex, randomLiveOffset, false);
  }

  state.liveBooted = true;
  await updateListeners();
}

async function ensureBackgroundPlayback() {
  if (!state.liveBooted || !els.audio.src) return;

  if (els.audio.paused) {
    els.audio.muted = true;
    updateVolumeButtonState();
    els.audio.play().catch(() => {});
  }
}

async function handleStartRadio() {
  state.isLiveActivated = true;
  state.listenerIdentity = null;

  await registerListener();
  await updateListeners();
  await loadTrackStats();
  await loadMyTotalPlays();

  els.radioShell.classList.remove("pre-live");
  setHidden(els.startOverlay, true);
  updateConceptVisibility();

  if (!els.audio.src && state.tracks.length) {
    const nextIndex = chooseNextTrackIndex();
    const previewDuration = nextIndex >= 0 ? getTrackPreviewDuration(state.tracks[nextIndex]) : 60;
    const randomOffset = Math.floor(Math.random() * Math.max(previewDuration, 1));
    playTrackAt(nextIndex, randomOffset, false);
  }

  if (Number(els.volume.value) > 0) {
    els.audio.muted = false;
  }

  updateVolumeButtonState();

  els.audio.play().catch(err => {
    console.error("Start Radio play error:", err);
  });
}

async function advanceAfterTrackCompletion() {
  if (state.trackAdvanceLock) return;
  state.trackAdvanceLock = true;

  try {
    await awardListeningSecond();
    nextTrack(0, true);
  } finally {
    state.trackAdvanceLock = false;
  }
}

async function handleSkip() {
  if (!state.currentUser) return;
  if (state.currentCoins < SKIP_COST) return;

  els.skipBtn.disabled = true;

  const { data, error } = await supabaseClient.rpc("skip_track_cost");

  if (error || !data) {
    console.error("handleSkip rpc error:", error);
    updateSkipButtonState();
    return;
  }

  if (!data.success) {
    if (typeof data.coins !== "undefined") {
      setCurrency(data.coins);
    } else {
      updateSkipButtonState();
    }
    return;
  }

  setCurrency(data.coins);
  nextTrack(0, true);
}

function handleLike() {
  if (!state.currentUser) return;

  state.liked = !state.liked;

  if (state.liked) {
    els.likeBtn.innerHTML = `<span class="icon">♥</span>Liked`;
    els.likeBtn.classList.add("liked");
    return;
  }

  els.likeBtn.innerHTML = `<span class="icon">♥</span>Like`;
  els.likeBtn.classList.remove("liked");
}

async function handleLogout() {
  els.logoutBtn.disabled = true;
  els.desktopLogoutBtn.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    state.listenerIdentity = null;
    state.currentCoins = 0;
    state.dailySecondsEarned = 0;
    state.dailySecondsEarnedDate = null;
    await refreshAuthDependentUI();
  } catch (err) {
    console.error("handleLogout error:", err);
  } finally {
    els.logoutBtn.disabled = false;
    els.desktopLogoutBtn.disabled = false;
  }
}

function bindUIEvents() {
  els.showLoginBtn.onclick = () => {
    closeHeaderPanels();
  };

  els.headerAvatarBtn.onclick = () => {
    els.volumeControl.classList.remove("open");
    els.accountMenu.classList.toggle("hidden");
  };

  els.accountProfileLink.onclick = () => {
    setHidden(els.accountMenu, true);
  };

  els.accountNotificationsLink.onclick = () => {
    setHidden(els.accountMenu, true);
  };

  els.desktopLogoutBtn.onclick = handleLogout;
  els.logoutBtn.onclick = handleLogout;

  els.volumeBtn.onclick = () => {
    setHidden(els.accountMenu, true);
    els.volumeControl.classList.toggle("open");
  };

  els.startBtn.onclick = handleStartRadio;
  els.skipBtn.onclick = () => {
    handleSkip().catch(err => console.error("handleSkip error:", err));
  };
  els.likeBtn.onclick = handleLike;

  els.volume.addEventListener("input", (e) => {
    const v = Number(e.target.value);
    els.audio.volume = v;
    els.audio.muted = v === 0 || !state.isLiveActivated;
    updateVolumeButtonState();
  });

  document.addEventListener("click", (e) => {
    const insideHeaderRight = e.target.closest(".header-right");
    const insideVolumeWrap = e.target.closest(".volume-wrap");
    const isAvatarButton = e.target.closest("#headerAvatarBtn");

    if (!insideHeaderRight && !isAvatarButton) {
      setHidden(els.accountMenu, true);
    }

    if (!insideVolumeWrap) {
      els.volumeControl.classList.remove("open");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setHidden(els.accountMenu, true);
      els.volumeControl.classList.remove("open");
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.isLiveActivated) {
      registerListener().catch(() => {});
    }
    updateListeners().catch(() => {});
    ensureBackgroundPlayback();
  });

  window.addEventListener("focus", () => {
    if (state.isLiveActivated) {
      registerListener().catch(() => {});
    }
    updateListeners().catch(() => {});
    ensureBackgroundPlayback();
  });

  els.audio.addEventListener("timeupdate", () => {
    const previewElapsed = Math.max(0, (els.audio.currentTime || 0) - state.currentPreviewStart);
    const clampedElapsed = Math.min(previewElapsed, state.currentPreviewDuration);

    els.progressFill.style.width = `${state.currentPreviewDuration > 0 ? (clampedElapsed / state.currentPreviewDuration) * 100 : 0}%`;
    setText(els.elapsedTimeEl, formatTime(clampedElapsed));

    if (previewElapsed >= state.currentPreviewDuration) {
      advanceAfterTrackCompletion().catch(err => {
        console.error("advanceAfterTrackCompletion error:", err);
      });
    }
  });

  els.audio.addEventListener("ended", () => {
    advanceAfterTrackCompletion().catch(err => {
      console.error("advanceAfterTrackCompletion error:", err);
    });
  });

  supabaseClient.auth.onAuthStateChange(() => {
    refreshAuthDependentUI().catch(err => console.error(err));
  });
}

function bindIntervals() {
  setInterval(() => {
    if (state.isLiveActivated && !document.hidden) {
      registerListener();
    }
  }, REFRESH_INTERVALS.listenerHeartbeat);

  setInterval(() => {
    updateListeners();
  }, REFRESH_INTERVALS.listenerCount);

  setInterval(async () => {
    await loadTracksFromSupabase();
    await ensureBackgroundPlayback();
  }, REFRESH_INTERVALS.tracksReload);
}

async function initPage() {
  updateJoinButtonHref();
  setLoggedOutView();
  updateVolumeButtonState();
  updateConceptVisibility();
  bindUIEvents();
  bindIntervals();
  await refreshAuthDependentUI();
  await bootstrapLiveRadio();
  updateJoinButtonHref();
}

initPage().catch(err => {
  console.error("initPage error:", err);
});
