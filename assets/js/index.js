const { getSupabaseClient, getFlagEmoji: sharedGetFlagEmoji, getFlagMarkup: sharedGetFlagMarkup, getProfileHref: sharedGetProfileHref, closeStandardHeaderPanels, setStandardHeaderAvatar, handleStandardHeaderAvatarAction, applyStandardMenuState, setStandardLoggedOutState, setStandardLoggedInState, bindStandardHeaderEvents, getCurrentUserSafe, syncLikedTrackIdsForUser, toggleTrackLikeInSupabase } = window.SSFMApp;
const supabaseClient = getSupabaseClient();

const DAILY_SECONDS_LIMIT = 10;
const SKIP_COST = 1;
const RADIO_SESSION_KEY = "ssfm_radio_session_v2";
const RADIO_VOLUME_KEY = "ssfm_radio_volume_v2";
const RADIO_LIKE_KEY = "ssfm_radio_likes_v2";
const VOLUME_AUTO_CLOSE_MS = 3000;
let volumeAutoCloseTimer = null;
const DEFAULT_VOLUME = 0.3;
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
  desktopLikedLink: document.getElementById("desktopLikedLink"),
  desktopStatsLink: document.getElementById("desktopStatsLink"),
  desktopTrackLink: document.getElementById("desktopTrackLink"),

  mobileLoginLink: document.getElementById("mobileLoginLink"),
  mobileProfileLink: document.getElementById("mobileProfileLink"),
  mobileNotificationsLink: document.getElementById("mobileNotificationsLink"),
  mobileLikedLink: document.getElementById("mobileLikedLink"),
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
  artistEl: document.getElementById("artist"),
  trackGenreEl: document.getElementById("trackGenre"),
  likeBtn: document.getElementById("likeBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  skipBtn: document.getElementById("skip"),
  featureNoteEl: document.getElementById("featureNote"),
  conceptSectionEl: document.getElementById("conceptSection"),
  newsFeedSectionEl: document.getElementById("newsFeedSection"),
  newsFeedListEl: document.getElementById("newsFeedList"),
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
  earnSecondsCopy: document.getElementById("earnSecondsCopy"),
  waveformWrap: document.querySelector(".waveform-wrap")
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
  trackAdvanceLock: false,
  rewardedTrackId: null,
  desiredPlayback: false,
  playbackUnlockBound: false,
  unexpectedPauseTimer: null,
  newsFeedItems: [],
  newsFeedIndex: 0,
  newsFeedTimer: null,
  newsFeedRefreshTimer: null
};

const REFRESH_INTERVALS = {
  listenerHeartbeat: 15000,
  listenerCount: 5000,
  tracksReload: 30000
};

const NEWS_FEED_JOIN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const NEWS_FEED_TRACK_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const NEWS_FEED_SUPPORT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function setHidden(el, hidden) {
  if (!el) return;
  el.classList.toggle("hidden", hidden);
}

function setText(el, value) {
  if (!el) return;
  el.textContent = value;
}


function clearNewsFeedTimers() {
  if (state.newsFeedTimer) {
    clearInterval(state.newsFeedTimer);
    state.newsFeedTimer = null;
  }
  if (state.newsFeedRefreshTimer) {
    clearInterval(state.newsFeedRefreshTimer);
    state.newsFeedRefreshTimer = null;
  }
}

function getTrackGenreLabel(track) {
  const primary = String(track?.genre_primary || "").trim();
  const secondary = String(track?.genre_secondary || "").trim();
  return primary || secondary || "";
}

function setTrackGenre(track) {
  const label = getTrackGenreLabel(track);
  if (!els.trackGenreEl) return;
  setText(els.trackGenreEl, label);
  setHidden(els.trackGenreEl, !label);
}

function escapeFeedHtml(value) {
  return escapeHtml(value || "");
}

function getNewsFeedProfileHref(item) {
  if (!item?.user_id) return "javascript:void(0)";
  return `artist.html?user_id=${encodeURIComponent(item.user_id)}`;
}

function getNewsFeedInitial(name) {
  return String(name || "A").trim().charAt(0).toUpperCase() || "A";
}

function getNewsFeedActorMarkup(item) {
  const href = getNewsFeedProfileHref(item);
  const safeName = escapeFeedHtml(item?.name || "Artist");
  return `<a class="news-feed-actor" href="${href}"><span class="news-feed-name">${safeName}</span></a>`;
}

function getNewsFeedAvatarMarkup(item) {
  const safeName = escapeFeedHtml(item?.name || "Artist");
  if (item?.photo_url) {
    return `<a class="news-feed-item-avatar" href="${getNewsFeedProfileHref(item)}"><img class="news-feed-avatar" src="${escapeFeedHtml(item.photo_url)}" alt="${safeName}" /></a>`;
  }
  return `<a class="news-feed-item-avatar" href="${getNewsFeedProfileHref(item)}"><span class="news-feed-avatar-fallback">${escapeFeedHtml(getNewsFeedInitial(item?.name))}</span></a>`;
}

function buildNewsFeedText(item) {
  if (!item) return "";
  const actor = getNewsFeedActorMarkup(item);
  const avatar = getNewsFeedAvatarMarkup(item);

  if (item.type === "join") {
    return `${avatar}<div class="news-feed-item-body"><span class="news-feed-copy">${actor} just joined 60 Seconds</span></div>`;
  }
  if (item.type === "approved_track") {
    return `${avatar}<div class="news-feed-item-body"><span class="news-feed-copy"><span class="news-feed-track">${escapeFeedHtml(item.track_title || "Untitled")}</span> by ${actor} is live!</span></div>`;
  }
  return `${avatar}<div class="news-feed-item-body"><span class="news-feed-copy">${actor} supported 10 artists today</span></div>`;
}

function renderNewsFeedSlice() {
  if (!els.newsFeedListEl) return;

  if (!state.currentUser || !state.newsFeedItems.length) {
    els.newsFeedListEl.innerHTML = '<div class="news-feed-item news-feed-empty">No community updates yet.</div>';
    return;
  }

  const source = state.newsFeedItems.slice(0, Math.min(state.newsFeedItems.length, 12));
  const shouldLoop = source.length >= 4;
  const repeated = [];

  if (!shouldLoop) {
    els.newsFeedListEl.style.transform = 'translateY(0px)';
    els.newsFeedListEl.innerHTML = source
      .map((item) => `<div class="news-feed-item">${buildNewsFeedText(item)}</div>`)
      .join('');
    return;
  }

  const copies = Math.max(3, Math.ceil(9 / source.length));
  for (let copyIndex = 0; copyIndex < copies; copyIndex += 1) {
    source.forEach((item) => {
      repeated.push(`<div class="news-feed-item">${buildNewsFeedText(item)}</div>`);
    });
  }

  els.newsFeedListEl.style.transform = 'translateY(0px)';
  els.newsFeedListEl.innerHTML = repeated.join('');
}

function advanceNewsFeed() {
  if (!els.newsFeedListEl || state.newsFeedItems.length <= 1) return;

  const firstItem = els.newsFeedListEl.querySelector(".news-feed-item");
  if (!firstItem) return;

  const itemHeight = firstItem.offsetHeight || 56;
  const totalSourceItems = Math.min(state.newsFeedItems.length, 12);
  const totalCycleHeight = itemHeight * totalSourceItems;

  state.newsFeedIndex += 0.2;
  const translateY = -(state.newsFeedIndex % totalCycleHeight);
  els.newsFeedListEl.style.transform = `translateY(${translateY}px)`;
}

async function loadNewsFeed() {
  if (!state.currentUser) {
    clearNewsFeedTimers();
    state.newsFeedItems = [];
    state.newsFeedIndex = 0;
    setHidden(els.newsFeedSectionEl, true);
    return;
  }

  try {
    const todayKey = getTodayDateKey();
    const nowMs = Date.now();

    const [profilesRes, approvedTracksRes, supportersRes, trackArtistsRes] = await Promise.all([
      supabaseClient
        .from("public_artist_profiles")
        .select("artist_name, created_at, user_id, photo_url")
        .not("artist_name", "is", null)
        .order("created_at", { ascending: false })
        .limit(24),
      supabaseClient
        .from("tracks")
        .select("title, artist, user_id, created_at, status")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(24),
      supabaseClient
        .from("profiles")
        .select("artist_name, user_id, photo_url, daily_seconds_earned, daily_seconds_earned_date")
        .not("artist_name", "is", null)
        .eq("daily_seconds_earned_date", todayKey)
        .gte("daily_seconds_earned", DAILY_SECONDS_LIMIT)
        .order("daily_seconds_earned", { ascending: false })
        .limit(48),
      supabaseClient
        .from("public_artist_profiles")
        .select("user_id, artist_name, photo_url")
        .not("artist_name", "is", null)
        .limit(400)
    ]);

    const items = [];
    const profileByUserId = new Map(
      (trackArtistsRes.data || [])
        .filter((profile) => String(profile?.user_id || "").trim() && String(profile?.artist_name || "").trim())
        .map((profile) => [String(profile.user_id || ""), profile])
    );

    (profilesRes.data || []).forEach((profile) => {
      const userId = String(profile?.user_id || "").trim();
      const name = String(profile?.artist_name || "").trim();
      const createdAtMs = new Date(profile?.created_at || 0).getTime() || 0;
      if (!userId || !name || !createdAtMs) return;
      if ((nowMs - createdAtMs) > NEWS_FEED_JOIN_WINDOW_MS) return;
      items.push({
        type: "join",
        name,
        user_id: userId,
        photo_url: profile.photo_url || "",
        sortTime: createdAtMs
      });
    });

    (approvedTracksRes.data || []).forEach((track) => {
      const userId = String(track?.user_id || "").trim();
      const linkedProfile = profileByUserId.get(userId);
      const createdAtMs = new Date(track?.created_at || 0).getTime() || 0;
      const name = String(linkedProfile?.artist_name || track?.artist || "").trim();
      if (!userId || !linkedProfile || !name || !createdAtMs) return;
      if ((nowMs - createdAtMs) > NEWS_FEED_TRACK_WINDOW_MS) return;
      items.push({
        type: "approved_track",
        name,
        user_id: userId,
        track_title: track.title || "Untitled",
        photo_url: linkedProfile.photo_url || "",
        sortTime: createdAtMs
      });
    });

    (supportersRes.data || []).forEach((profile) => {
      const userId = String(profile?.user_id || "").trim();
      const linkedProfile = profileByUserId.get(userId);
      const name = String(profile?.artist_name || linkedProfile?.artist_name || "").trim();
      const profileDate = String(profile?.daily_seconds_earned_date || "").trim();
      const dailySeconds = Number(profile?.daily_seconds_earned || 0);
      if (!userId || !name) return;
      if (profileDate !== todayKey || dailySeconds < DAILY_SECONDS_LIMIT) return;
      items.push({
        type: "support_today",
        name,
        user_id: userId,
        photo_url: profile.photo_url || linkedProfile?.photo_url || "",
        sortTime: nowMs + dailySeconds
      });
    });

    const deduped = [];
    const seen = new Set();
    items
      .sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0))
      .forEach((item) => {
        const key = `${item.type}:${item.user_id || ""}:${item.track_title || ""}`;
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(item);
      });

    state.newsFeedItems = deduped.slice(0, 18);

    state.newsFeedIndex = 0;
    setHidden(els.newsFeedSectionEl, false);
    renderNewsFeedSlice();

    clearNewsFeedTimers();
    if (state.newsFeedItems.length >= 4) {
      state.newsFeedTimer = setInterval(advanceNewsFeed, 40);
    }
    state.newsFeedRefreshTimer = setInterval(() => {
      loadNewsFeed().catch((err) => console.error("loadNewsFeed refresh error:", err));
    }, 60000);
  } catch (err) {
    console.error("loadNewsFeed error:", err);
    setHidden(els.newsFeedSectionEl, true);
  }
}



function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}


function getFlagEmoji(countryName) {
  return sharedGetFlagEmoji(countryName);
}

function getFlagMarkup(countryName) {
  return sharedGetFlagMarkup(countryName).replace('aria-hidden="true"', `aria-label="${escapeHtml(countryName)}"`);
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

function getSavedRadioSession() {
  try {
    return JSON.parse(localStorage.getItem(RADIO_SESSION_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveRadioSession(patch = {}) {
  const next = { ...getSavedRadioSession(), ...patch, lastUpdatedAt: Date.now(), lastPath: window.location.pathname };
  localStorage.setItem(RADIO_SESSION_KEY, JSON.stringify(next));
  return next;
}

function hasStartedRadioToday() {
  const session = getSavedRadioSession();
  return Boolean(session?.isStarted && session?.startedDate === getTodayDateKey());
}

function getSafeVolume(candidate) {
  const value = Number(candidate);
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.max(0, Math.min(1, value));
}

function syncRadioVolumeStorage() {
  localStorage.setItem(RADIO_VOLUME_KEY, String(Math.max(0, Math.min(1, Number(els.audio.volume) || 0))));
}

function persistRadioSession() {
  const currentTrack = state.tracks[state.current] || null;
  const previewOffset = Math.max(0, (els.audio.currentTime || 0) - state.currentPreviewStart);
  saveRadioSession({
    startedDate: getTodayDateKey(),
    isStarted: state.isLiveActivated,
    isPlaying: state.isLiveActivated && !els.audio.paused,
    desiredPlaying: state.isLiveActivated && state.desiredPlayback,
    currentTrack,
    currentTrackId: currentTrack?.id || null,
    currentIndex: state.current,
    previewOffset,
    volume: getSafeVolume(els.audio.volume),
    muted: els.audio.muted
  });
  syncRadioVolumeStorage();
}

function updatePauseButtonState() {
  if (!els.pauseBtn) return;
  const isPlaying = state.isLiveActivated && !els.audio.paused;
  els.pauseBtn.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
  els.pauseBtn.innerHTML = isPlaying
    ? `<span class="icon">⏸</span>`
    : `<span class="icon">▶</span>`;
}

function syncWaveformState() {
  if (!els.waveformWrap) return;
  const isPlaying = state.isLiveActivated && !els.audio.paused;
  els.waveformWrap.classList.toggle("is-paused", !isPlaying);
}

function clearUnexpectedPauseTimer() {
  if (!state.unexpectedPauseTimer) return;
  clearTimeout(state.unexpectedPauseTimer);
  state.unexpectedPauseTimer = null;
}

function scheduleUnexpectedResume(delay = 180) {
  clearUnexpectedPauseTimer();

  if (!state.isLiveActivated || !state.desiredPlayback || !els.audio.src) return;

  state.unexpectedPauseTimer = setTimeout(() => {
    if (!state.isLiveActivated || !state.desiredPlayback || !els.audio.src || !els.audio.paused) return;
    els.audio.play().then(() => {
      updatePauseButtonState();
      syncWaveformState();
      persistRadioSession();
    }).catch(() => {});
  }, delay);
}

function getDesiredSessionPlayback(session = getSavedRadioSession()) {
  if (!session?.isStarted || session?.startedDate !== getTodayDateKey()) return false;
  if (typeof session.desiredPlaying === "boolean") return session.desiredPlaying;
  return session.isPlaying !== false;
}

async function restoreExactPlaybackState() {
  if (!state.liveBooted || !els.audio.src) return;

  const session = getSavedRadioSession();
  const safeVolume = getSafeVolume(session?.volume ?? localStorage.getItem(RADIO_VOLUME_KEY) ?? DEFAULT_VOLUME);
  els.volume.value = String(safeVolume);
  els.audio.volume = safeVolume;
  els.audio.muted = safeVolume === 0;
  updateVolumeButtonState();

  const desiredOffset = Number(session?.previewOffset);
  if (Number.isFinite(desiredOffset)) {
    const currentOffset = Math.max(0, (els.audio.currentTime || 0) - state.currentPreviewStart);
    if (Math.abs(currentOffset - desiredOffset) > 2 && !els.audio.seeking) {
      try {
        els.audio.currentTime = state.currentPreviewStart + Math.max(0, desiredOffset);
      } catch (err) {
        console.error("restore currentTime error:", err);
      }
    }
  }

  state.desiredPlayback = getDesiredSessionPlayback(session);

  if (state.desiredPlayback) {
    if (els.audio.paused) {
      try {
        await els.audio.play();
      } catch (err) {
        console.log("restore play blocked:", err);
        scheduleUnexpectedResume(260);
      }
    }
  } else if (!els.audio.paused) {
    els.audio.pause();
  }

  updatePauseButtonState();
  syncWaveformState();
  persistRadioSession();
}

function bindPlaybackUnlockEvents() {
  if (state.playbackUnlockBound) return;
  state.playbackUnlockBound = true;

  const resumeIfNeeded = () => {
    if (!state.isLiveActivated || !state.desiredPlayback || !els.audio.src || !els.audio.paused) return;
    els.audio.play().then(() => {
      updatePauseButtonState();
      syncWaveformState();
      persistRadioSession();
    }).catch(() => {});
  };

  ["touchstart", "pointerdown", "click"].forEach((eventName) => {
    document.addEventListener(eventName, resumeIfNeeded, { passive: true });
  });
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


function handleHeaderAvatarAction(profileHref) {
  handleStandardHeaderAvatarAction({ header: { accountMenu: els.accountMenu } }, profileHref);
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


function broadcastCurrencyUpdate(coins, dailySecondsEarned = state.dailySecondsEarned) {
  try {
    const payload = {
      coins: Number(coins) || 0,
      daily_seconds_earned: Number(dailySecondsEarned) || 0,
      updatedAt: Date.now()
    };
    localStorage.setItem("ssfm_profile_runtime_state", JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("ssfm:coins-updated", { detail: payload }));
  } catch (err) {
    console.error("broadcastCurrencyUpdate error:", err);
  }
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

function closeVolumeControl() {
  if (volumeAutoCloseTimer) {
    window.clearTimeout(volumeAutoCloseTimer);
    volumeAutoCloseTimer = null;
  }
  els.volumeControl?.classList.remove("open");
}

function scheduleVolumeAutoClose() {
  if (!els.volumeControl?.classList.contains("open")) return;
  if (volumeAutoCloseTimer) window.clearTimeout(volumeAutoCloseTimer);
  volumeAutoCloseTimer = window.setTimeout(closeVolumeControl, VOLUME_AUTO_CLOSE_MS);
}

function openVolumeControl() {
  els.volumeControl?.classList.add("open");
  scheduleVolumeAutoClose();
}

function toggleVolumeControl() {
  if (!els.volumeControl) return;
  if (els.volumeControl.classList.contains("open")) closeVolumeControl();
  else openVolumeControl();
}

function closeHeaderPanels() {
  closeStandardHeaderPanels({ header: { accountMenu: els.accountMenu } });
  closeVolumeControl();
}

function getProfileHref(profile) {
  return sharedGetProfileHref(profile);
}


function readLikedTrackIds() {
  try {
    const raw = localStorage.getItem(RADIO_LIKE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeLikedTrackIds(ids) {
  localStorage.setItem(RADIO_LIKE_KEY, JSON.stringify(Array.from(new Set((ids || []).map(String)))));
}

function getCurrentTrackLikeKey() {
  const track = state.tracks[state.current] || null;
  return track?.id ? String(track.id) : "";
}

function isCurrentTrackOwn() {
  const track = state.tracks[state.current] || null;
  return Boolean(state.currentUser?.id && track?.user_id && String(state.currentUser.id) === String(track.user_id));
}

function resetLike() {
  const likeKey = getCurrentTrackLikeKey();
  const likedIds = readLikedTrackIds();
  state.liked = Boolean(likeKey && likedIds.includes(String(likeKey)));

  if (isCurrentTrackOwn()) {
    els.likeBtn.innerHTML = `<img src="icons/like.png" alt="" class="btn-icon-img like-icon" aria-hidden="true" />`;
    els.likeBtn.classList.remove("liked", "is-liked", "like-feedback");
    els.likeBtn.setAttribute("aria-pressed", "false");
    els.likeBtn.setAttribute("aria-label", "You cannot like your own track");
    els.likeBtn.classList.add("like-own-disabled");
    return;
  }

  els.likeBtn.innerHTML = `<img src="icons/like.png" alt="" class="btn-icon-img like-icon" aria-hidden="true" />`;
  els.likeBtn.classList.toggle("liked", state.liked);
  els.likeBtn.classList.toggle("is-liked", state.liked);
  els.likeBtn.setAttribute("aria-pressed", state.liked ? "true" : "false");
  els.likeBtn.setAttribute("aria-label", state.liked ? "Unlike track" : "Like track");
  els.likeBtn.classList.remove("like-own-disabled");
}

function updateEarnSecondsProgress() {
  const safeCurrent = Math.max(0, Number(state.dailySecondsEarned) || 0);
  const safeLimit = Math.max(1, Number(DAILY_SECONDS_LIMIT) || 1);
  const percentage = Math.min((safeCurrent / safeLimit) * 100, 100);

  if (els.earnSecondsProgress) {
    els.earnSecondsProgress.style.width = `${percentage}%`;
  }

  if (els.earnSecondsCopy) {
    els.earnSecondsCopy.innerHTML = `Earn Seconds by listening the entire tune <strong class="earn-seconds-amount">${safeCurrent}/${safeLimit}</strong> today.`;
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

  els.likeBtn.disabled = !isLoggedIn || isCurrentTrackOwn();
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
  applyStandardMenuState({
    header: { accountProfileLink: els.accountProfileLink },
    desktopNav: {
      loginLink: els.desktopLoginLink,
      logoutBtn: els.desktopLogoutBtn,
      profileLink: els.desktopProfileLink,
      notificationsLink: els.desktopNotificationsLink,
      likedLink: els.desktopLikedLink,
      statsLink: els.desktopStatsLink,
      trackLink: els.desktopTrackLink
    },
    mobileNav: {
      loginLink: els.mobileLoginLink,
      profileLink: els.mobileProfileLink,
      notificationsLink: els.mobileNotificationsLink,
      likedLink: els.mobileLikedLink,
      trackLink: els.mobileTrackLink
    }
  }, user, profile, track);
  els.submitTrackBtn.textContent = "Tune";
  updateJoinButtonHref();
}

function setHeaderAvatar(photoUrl, artistName) {
  setStandardHeaderAvatar({ header: { headerAvatarImage: els.headerAvatarImage, headerAvatarFallback: els.headerAvatarFallback } }, photoUrl, artistName);
}

function setLoggedOutView() {
  closeHeaderPanels();
  setStandardLoggedOutState({
    header: {
      showLoginBtn: els.showLoginBtn,
      headerAvatarBtn: els.headerAvatarBtn,
      headerAvatarImage: els.headerAvatarImage,
      headerAvatarFallback: els.headerAvatarFallback,
      accountMenu: els.accountMenu,
      accountProfileLink: els.accountProfileLink,
      currencyBadge: els.currencyBadge,
      currencyValue: els.currencyValue
    },
    desktopNav: { loginLink: els.desktopLoginLink, logoutBtn: els.desktopLogoutBtn, profileLink: els.desktopProfileLink, notificationsLink: els.desktopNotificationsLink, likedLink: els.desktopLikedLink, statsLink: els.desktopStatsLink, trackLink: els.desktopTrackLink },
    mobileNav: { loginLink: els.mobileLoginLink, profileLink: els.mobileProfileLink, notificationsLink: els.mobileNotificationsLink, likedLink: els.mobileLikedLink, trackLink: els.mobileTrackLink }
  });

  setHidden(els.submitTrackBtn, true);

  state.currentProfileData = null;
  state.currentTrackData = null;
  state.currentUser = null;
  writeLikedTrackIds([]);
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
  setHidden(els.newsFeedSectionEl, true);
  clearNewsFeedTimers();
  updateJoinButtonHref();
}

function setLoggedInView() {
  setHidden(els.submitTrackBtn, true);
  setStandardLoggedInState({ header: { showLoginBtn: els.showLoginBtn, headerAvatarBtn: els.headerAvatarBtn, accountMenu: els.accountMenu, currencyBadge: els.currencyBadge, currencyValue: els.currencyValue } }, { coins: state.currentCoins });
  updateCurrencyVisibility(state.currentUser || true);
}

async function getSessionUser() {
  return getCurrentUserSafe();
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
  broadcastCurrencyUpdate(state.currentCoins, state.dailySecondsEarned);

  if (state.dailySecondsEarned >= DAILY_SECONDS_LIMIT) {
    await loadNewsFeed().catch((err) => console.error("loadNewsFeed threshold refresh error:", err));
  }

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

    // Verberg start-overlay direct als ingelogd — voorkomt flash
    if (els.startOverlay && !state.isLiveActivated) {
      els.startOverlay.style.visibility = 'hidden';
      els.startOverlay.style.opacity = '0';
    }

    updateCurrencyVisibility(user);
    setCurrency(state.currentCoins || 0);
    setLoggedInView();

    const [profile, tune] = await Promise.all([
      loadMyProfile(user.id),
      loadMyTune(user.id),
      syncLikedTrackIdsForUser(user.id, RADIO_LIKE_KEY)
    ]);

    applyMenuState(user, profile, tune);
    updateInteractiveControls();
    resetLike();
    await loadNewsFeed();
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
    .select("id, title, artist, file_url, user_id, play_count, status, created_at, preview_start_seconds, preview_duration_seconds, genre_primary, genre_secondary")
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
    preview_duration_seconds: track.preview_duration_seconds,
    genre_primary: track.genre_primary || null,
    genre_secondary: track.genre_secondary || null,
    nationality: null
  }));
}


async function loadTrackNationalities() {
  try {
    const userIds = Array.from(new Set(state.tracks.map((track) => track.user_id).filter(Boolean)));
    if (!userIds.length) return;

    const { data, error } = await supabaseClient
      .from("public_artist_profiles")
      .select("user_id, nationality, photo_url")
      .in("user_id", userIds);

    if (error || !data) return;

    const profileByUserId = new Map(data.map((row) => [String(row.user_id), row]));
    state.tracks = state.tracks.map((track) => {
      const profile = profileByUserId.get(String(track.user_id || ""));
      return {
        ...track,
        nationality: track.nationality || profile?.nationality || null,
        photo_url: track.photo_url || profile?.photo_url || null,
      };
    });

    // Herrender artiest nu nationality + photo_url beschikbaar zijn
    const currentTrack = state.tracks[state.currentTrackIndex ?? 0];
    if (currentTrack) renderArtist(currentTrack);
  } catch (err) {
    console.error("loadTrackNationalities error:", err);
  }
}

function renderArtist(track) {
  if (!els.artistEl) return;

  const photoHtml = track.photo_url
    ? `<img class="artist-player-photo" src="${escapeHtml(track.photo_url)}" alt="" aria-hidden="true" />`
    : `<span class="artist-player-photo artist-player-photo--fallback">${escapeHtml((track.artist || 'A').charAt(0).toUpperCase())}</span>`;

  if (track.user_id) {
    els.artistEl.outerHTML = `
      <a id="artist" class="artist-link" href="artist.html?user_id=${encodeURIComponent(track.user_id)}">
        ${photoHtml}${getFlagMarkup(track.nationality)}<span class="artist-name-text">${escapeHtml(track.artist)}</span>
      </a>
    `;
    els.artistEl = document.getElementById("artist");
    return;
  }

  els.artistEl.outerHTML = `<span id="artist" class="artist-inline">${photoHtml}${getFlagMarkup(track.nationality)}<span class="artist-name-text">${escapeHtml(track.artist)}</span></span>`;
  els.artistEl = document.getElementById("artist");
}

function setTrackUI(track) {
  setText(els.titleEl, track.title || "Untitled");
  renderArtist(track);
  setTrackGenre(track);

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
    .then(async () => {
      track.play_count = (track.play_count || 0) + 1;
      const { error: analyticsError } = await supabaseClient.rpc("increment_track_daily_streams", {
        p_track_id: track.id,
        p_amount: 1
      });
      if (analyticsError) {
        console.error("increment_track_daily_streams error:", analyticsError);
      }
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
  if (els.artistEl) {
    els.artistEl.outerHTML = `<span id="artist">Check back soon</span>`;
    els.artistEl = document.getElementById("artist");
  }
  setTrackGenre(null);
  els.progressFill.style.width = "0%";
  setText(els.elapsedTimeEl, "0:00");
  setText(els.durationTimeEl, "1:00");
  updateEarnSecondsProgress();
}

function playTrackAt(index, previewOffset = 0, countPlay = true, autoplay = state.desiredPlayback) {
  const track = state.tracks[index];
  if (index < 0 || !track) return;

  state.current = index;
  state.desiredPlayback = Boolean(autoplay);

  const previewStart = getTrackPreviewStart(track);
  const previewDuration = getTrackPreviewDuration(track);
  const safeOffset = Math.max(0, Math.min(previewOffset, Math.max(previewDuration - 0.25, 0)));
  const targetStartTime = previewStart + safeOffset;

  setTrackUI(track);
  els.audio.src = track.file_url;
  els.audio.autoplay = Boolean(autoplay);
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

    if (autoplay) {
      const playPromise = els.audio.play();
      if (playPromise) {
        playPromise.catch(err => {
          console.log("audio play blocked:", err);
          scheduleUnexpectedResume(260);
        });
      }
    } else {
      clearUnexpectedPauseTimer();
      els.audio.pause();
      updatePauseButtonState();
      syncWaveformState();
    }
  };

  persistRadioSession();

  if (countPlay) {
    incrementPlayCount(track);
  }
}

function nextTrack(previewOffset = 0, countPlay = true, autoplay = state.desiredPlayback) {
  if (!state.tracks.length) {
    setEmptyRadioState();
    return;
  }

  const nextIndex = chooseNextTrackIndex();
  playTrackAt(nextIndex, previewOffset, countPlay, autoplay);
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
    if (state.isLiveActivated) {
      await registerListener();
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { count, error } = await supabaseClient
      .from("listeners")
      .select("id", { count: "exact", head: true })
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
  await loadTrackNationalities();

  if (!state.tracks.length) {
    setEmptyRadioState();
    await updateListeners();
    return;
  }

  const storedVolume = localStorage.getItem(RADIO_VOLUME_KEY);
  const safeVolume = getSafeVolume(storedVolume ?? els.volume.value ?? DEFAULT_VOLUME);
  els.volume.value = String(safeVolume);
  els.audio.volume = safeVolume;
  els.audio.muted = safeVolume === 0;
  updateVolumeButtonState();
  updatePauseButtonState();

  const session = getSavedRadioSession();
  if (session?.isStarted && session?.startedDate === getTodayDateKey()) {
    state.isLiveActivated = true;
    state.desiredPlayback = getDesiredSessionPlayback(session);
    els.radioShell.classList.remove("pre-live");
    setHidden(els.startOverlay, true);
    updateConceptVisibility();

    let index = state.tracks.findIndex(track => String(track.id) === String(session.currentTrackId || session.currentTrack?.id || ""));
    if (index < 0) index = Number.isInteger(session.currentIndex) ? session.currentIndex : chooseNextTrackIndex();
    if (index < 0) index = chooseNextTrackIndex();
    await playTrackAt(index, Number(session.previewOffset) || 0, false, state.desiredPlayback);
  } else {
    state.isLiveActivated = false;
    state.desiredPlayback = false;
    els.radioShell.classList.add("pre-live");
    setHidden(els.startOverlay, false);
    if (els.startOverlay) {
      els.startOverlay.style.visibility = '';
      els.startOverlay.style.opacity = '';
    }
    updateConceptVisibility();

    const previewIndex = chooseNextTrackIndex();
    if (previewIndex >= 0) {
      await playTrackAt(previewIndex, 0, false, false);
    }
  }

  state.liveBooted = true;
  syncWaveformState();
  await updateListeners();
}


async function handleStartRadio() {
  state.isLiveActivated = true;
  state.desiredPlayback = true;
  state.listenerIdentity = null;

  saveRadioSession({
    startedDate: getTodayDateKey(),
    isStarted: true,
    isPlaying: true,
    desiredPlaying: true
  });

  await registerListener();
  await updateListeners();
  await loadTrackStats();
  await loadMyTotalPlays();

  els.radioShell.classList.remove("pre-live");
  setHidden(els.startOverlay, true);
  if (els.startOverlay) {
    els.startOverlay.style.visibility = '';
    els.startOverlay.style.opacity = '';
  }
  updateConceptVisibility();

  if (!els.audio.src && state.tracks.length) {
    const nextIndex = chooseNextTrackIndex();
    const previewDuration = nextIndex >= 0 ? getTrackPreviewDuration(state.tracks[nextIndex]) : 60;
    const randomOffset = Math.floor(Math.random() * Math.max(previewDuration, 1));
    await playTrackAt(nextIndex, randomOffset, false, true);
  }

  const startVolume = getSafeVolume(els.volume.value);
  els.audio.volume = startVolume;
  els.audio.muted = startVolume === 0;

  updateVolumeButtonState();
  updatePauseButtonState();
  persistRadioSession();

  els.audio.play().catch(err => {
    console.error("Start Radio play error:", err);
  });
}

async function advanceAfterTrackCompletion() {
  if (state.trackAdvanceLock) return;

  const currentTrack = state.tracks[state.current] || null;
  const currentTrackId = currentTrack?.id || null;

  if (currentTrackId && state.rewardedTrackId === currentTrackId) return;

  state.trackAdvanceLock = true;
  if (currentTrackId) {
    state.rewardedTrackId = currentTrackId;
  }

  try {
    await awardListeningSecond();
    nextTrack(0, true, true);
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
  nextTrack(0, true, state.desiredPlayback);
}

async function handleLike() {
  if (!state.currentUser || isCurrentTrackOwn()) return;

  const track = state.tracks[state.current] || null;
  const likeKey = getCurrentTrackLikeKey();
  if (!track || !likeKey) return;

  if (els.likeBtn) els.likeBtn.disabled = true;

  try {
    const result = await toggleTrackLikeInSupabase({
      trackId: likeKey,
      artistUserId: track.user_id,
      likerUserId: state.currentUser.id,
      likerDisplayName: state.currentProfileData?.artist_name || state.currentUser.email || 'Someone'
    });

    if (result?.error) throw result.error;

    const likedIds = new Set(readLikedTrackIds());
    if (result?.liked) likedIds.add(String(likeKey));
    else likedIds.delete(String(likeKey));
    writeLikedTrackIds([...likedIds]);
    state.liked = Boolean(result?.liked);
    resetLike();
    if (els.likeBtn) {
      els.likeBtn.classList.remove("like-feedback");
      void els.likeBtn.offsetWidth;
      els.likeBtn.classList.add("like-feedback");
    }
  } catch (err) {
    console.error('handleLike error:', err);
  } finally {
    if (els.likeBtn) els.likeBtn.disabled = !state.currentUser || isCurrentTrackOwn();
  }
}

function handlePauseToggle() {
  if (!state.isLiveActivated) return;

  if (els.audio.paused) {
    state.desiredPlayback = true;
    clearUnexpectedPauseTimer();
    els.audio.play().catch(err => {
      console.error("resume error:", err);
      scheduleUnexpectedResume(260);
    });
  } else {
    state.desiredPlayback = false;
    clearUnexpectedPauseTimer();
    els.audio.pause();
  }

  updatePauseButtonState();
  syncWaveformState();
  persistRadioSession();
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
    closeVolumeControl();
    handleHeaderAvatarAction(els.accountProfileLink?.href || "artist.html");
  };

  if (els.accountProfileLink) {
    els.accountProfileLink.onclick = () => {
      setHidden(els.accountMenu, true);
    };
  }

  if (els.accountNotificationsLink) {
    els.accountNotificationsLink.onclick = () => {
      setHidden(els.accountMenu, true);
    };
  }

  els.desktopLogoutBtn.onclick = handleLogout;
  els.logoutBtn.onclick = handleLogout;

  els.volumeBtn.onclick = () => {
    setHidden(els.accountMenu, true);
    toggleVolumeControl();
  };

  els.startBtn.onclick = handleStartRadio;
  if (els.pauseBtn) els.pauseBtn.onclick = handlePauseToggle;
  els.skipBtn.onclick = () => {
    handleSkip().catch(err => console.error("handleSkip error:", err));
  };
  els.likeBtn.onclick = handleLike;

  els.volume.addEventListener("input", (e) => {
    const v = getSafeVolume(e.target.value);
    els.audio.volume = v;
    els.audio.muted = v === 0;
    updateVolumeButtonState();
    syncRadioVolumeStorage();
    persistRadioSession();
    scheduleVolumeAutoClose();
  });

  ["pointermove", "pointerdown", "focusin"].forEach((eventName) => {
    els.volumeControl?.addEventListener(eventName, scheduleVolumeAutoClose);
  });

  document.addEventListener("click", (e) => {
    const insideHeaderRight = e.target.closest(".header-right");
    const insideVolumeWrap = e.target.closest(".volume-control");
    const isAvatarButton = e.target.closest("#headerAvatarBtn");

    if (!insideHeaderRight && !isAvatarButton) {
      setHidden(els.accountMenu, true);
    }

    if (!insideVolumeWrap) {
      closeVolumeControl();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setHidden(els.accountMenu, true);
      closeVolumeControl();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      persistRadioSession();
      return;
    }
    if (state.isLiveActivated) {
      registerListener().catch(() => {});
    }
    updateListeners().catch(() => {});
    restoreExactPlaybackState().catch(() => {});
  });

  window.addEventListener("focus", () => {
    if (state.isLiveActivated) {
      registerListener().catch(() => {});
    }
    updateListeners().catch(() => {});
    restoreExactPlaybackState().catch(() => {});
  });

  window.addEventListener("pageshow", () => {
    restoreExactPlaybackState().catch(() => {});
  });

  els.audio.addEventListener("timeupdate", () => {
    const previewElapsed = Math.max(0, (els.audio.currentTime || 0) - state.currentPreviewStart);
    const clampedElapsed = Math.min(previewElapsed, state.currentPreviewDuration);

    els.progressFill.style.width = `${state.currentPreviewDuration > 0 ? (clampedElapsed / state.currentPreviewDuration) * 100 : 0}%`;
    setText(els.elapsedTimeEl, formatTime(clampedElapsed));
    persistRadioSession();

    if (previewElapsed >= state.currentPreviewDuration) {
      advanceAfterTrackCompletion().catch(err => {
        console.error("advanceAfterTrackCompletion error:", err);
      });
    }
  });

  els.audio.addEventListener("play", () => {
    clearUnexpectedPauseTimer();
    updatePauseButtonState();
    syncWaveformState();
    persistRadioSession();
  });

  els.audio.addEventListener("pause", () => {
    updatePauseButtonState();
    syncWaveformState();
    persistRadioSession();
    if (!document.hidden && state.desiredPlayback) {
      scheduleUnexpectedResume(220);
    }
  });

  els.audio.addEventListener("ended", () => {
    advanceAfterTrackCompletion().catch(err => {
      console.error("advanceAfterTrackCompletion error:", err);
    });
  });

  window.addEventListener("beforeunload", () => {
    clearUnexpectedPauseTimer();
    persistRadioSession();
  });
  window.addEventListener("pagehide", () => {
    clearUnexpectedPauseTimer();
    persistRadioSession();
  });
  bindPlaybackUnlockEvents();

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


function pauseMainRadioExternally() {
  state.desiredPlayback = false;
  clearUnexpectedPauseTimer();
  if (els.audio && !els.audio.paused) {
    els.audio.pause();
  }
  persistRadioSession();
  updatePauseButtonState();
  syncWaveformState();
}

window.__ssfmPauseMainRadio = pauseMainRadioExternally;

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
