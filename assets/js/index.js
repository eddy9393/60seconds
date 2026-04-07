const supabaseClient = window.supabase.createClient(
  "https://rgoutegbcpjytplqcwze.supabase.co",
  "sb_publishable_255qyDKS77nMU0pbedfa_A_3hdgtEHh"
);

const showLoginBtn = document.getElementById("showLoginBtn");
const headerAvatarBtn = document.getElementById("headerAvatarBtn");
const headerAvatarImage = document.getElementById("headerAvatarImage");
const headerAvatarFallback = document.getElementById("headerAvatarFallback");
const accountMenu = document.getElementById("accountMenu");
const accountProfileLink = document.getElementById("accountProfileLink");
const accountNotificationsLink = document.getElementById("accountNotificationsLink");

const desktopLoginLink = document.getElementById("desktopLoginLink");
const desktopLogoutBtn = document.getElementById("desktopLogoutBtn");
const desktopProfileLink = document.getElementById("desktopProfileLink");
const desktopNotificationsLink = document.getElementById("desktopNotificationsLink");
const desktopTrackLink = document.getElementById("desktopTrackLink");

const mobileLoginLink = document.getElementById("mobileLoginLink");
const mobileProfileLink = document.getElementById("mobileProfileLink");
const mobileNotificationsLink = document.getElementById("mobileNotificationsLink");
const mobileTrackLink = document.getElementById("mobileTrackLink");

const logoutBtn = document.getElementById("logout");
const submitTrackBtn = document.getElementById("submitTrackBtn");

const audio = document.getElementById("audio");
const startBtn = document.getElementById("start");
const startOverlay = document.getElementById("startOverlay");
const radioShell = document.getElementById("radioShell");
const titleEl = document.getElementById("title");
const artistWrapEl = document.getElementById("artistWrap");
const likeBtn = document.getElementById("likeBtn");
const skipBtn = document.getElementById("skip");
const featureNoteEl = document.getElementById("featureNote");
const conceptSectionEl = document.getElementById("conceptSection");
const volume = document.getElementById("volume");
const volumeBtn = document.getElementById("volumeBtn");
const volumeControl = document.getElementById("volumeControl");
const progressFill = document.getElementById("progress");
const elapsedTimeEl = document.getElementById("elapsedTime");
const durationTimeEl = document.getElementById("durationTime");
const listenersCountEl = document.getElementById("listenersCount");
const submittedCountEl = document.getElementById("submittedCount");
const submittedCardEl = document.getElementById("submittedCard");
const playsPerDayEl = document.getElementById("playsPerDay");
const playsCardEl = document.getElementById("playsCard");
const myPlaysCardEl = document.getElementById("myPlaysCard");
const myTotalPlaysEl = document.getElementById("myTotalPlays");

let tracks = [];
let current = -1;
let liked = false;
let listenerIdentity = null;
let isLiveActivated = false;
let liveBooted = false;
let currentProfileData = null;
let currentTrackData = null;
let currentPreviewStart = 0;
let currentPreviewDuration = 60;
let currentUser = null;

function updateConceptVisibility() {
  const shouldShow = !currentUser && isLiveActivated;
  conceptSectionEl.classList.toggle("hidden", !shouldShow);
}

function hideUserStats() {
  submittedCardEl.classList.add("hidden");
  playsCardEl.classList.add("hidden");
  myPlaysCardEl.classList.add("hidden");
  submittedCountEl.textContent = "0";
  playsPerDayEl.textContent = "0";
  myTotalPlaysEl.textContent = "0";
}

function updateVolumeButtonState() {
  const isMuted = audio.muted || Number(audio.volume) === 0;
  volumeBtn.classList.toggle("muted", isMuted);
  volumeBtn.setAttribute("aria-label", isMuted ? "Volume muted" : "Volume");
}

function closeHeaderPanels() {
  accountMenu.classList.add("hidden");
  volumeControl.classList.remove("open");
}

function getProfileHref(profile) {
  if (!profile) return "join.html";
  if (profile?.user_id) {
    return `artist.html?user_id=${encodeURIComponent(profile.user_id)}`;
  }
  return "join.html";
}

function updateInteractiveControls() {
  const isLoggedIn = Boolean(currentUser);

  likeBtn.disabled = !isLoggedIn;
  skipBtn.disabled = !isLoggedIn;
  featureNoteEl.classList.toggle("hidden", isLoggedIn);
  updateConceptVisibility();

  if (!isLoggedIn) {
    liked = false;
    likeBtn.innerHTML = `<span class="icon">♥</span>Like`;
    likeBtn.classList.remove("liked");
  }
}

function applyMenuState(user, profile, track) {
  const isLoggedIn = Boolean(user);
  const hasProfile = Boolean(profile);
  const hasTrack = Boolean(track);

  desktopLoginLink.classList.toggle("hidden", isLoggedIn);
  mobileLoginLink.classList.toggle("hidden", isLoggedIn);
  desktopLogoutBtn.classList.toggle("hidden", !isLoggedIn);

  desktopProfileLink.classList.toggle("hidden", !isLoggedIn);
  mobileProfileLink.classList.toggle("hidden", !isLoggedIn);

  desktopNotificationsLink.classList.toggle("hidden", !isLoggedIn);
  mobileNotificationsLink.classList.toggle("hidden", !isLoggedIn);

  desktopTrackLink.classList.toggle("hidden", !isLoggedIn || !hasProfile);
  mobileTrackLink.classList.toggle("hidden", !isLoggedIn || !hasProfile);

  const profileHref = getProfileHref(profile);

  desktopProfileLink.href = profileHref;
  mobileProfileLink.href = profileHref;
  accountProfileLink.href = profileHref;

  accountProfileLink.classList.toggle("hidden", !isLoggedIn);

  desktopTrackLink.setAttribute("data-track-mode", hasTrack ? "edit" : "submit");
  mobileTrackLink.setAttribute("data-track-mode", hasTrack ? "edit" : "submit");
  submitTrackBtn.textContent = "Tune";
}

function setLoggedOutView() {
  closeHeaderPanels();
  submitTrackBtn.classList.add("hidden");
  showLoginBtn.classList.remove("hidden");
  headerAvatarBtn.classList.add("hidden");
  headerAvatarImage.classList.add("hidden");
  headerAvatarFallback.classList.add("hidden");
  headerAvatarImage.src = "";
  accountProfileLink.classList.add("hidden");
  accountProfileLink.href = "javascript:void(0)";
  currentProfileData = null;
  currentTrackData = null;
  currentUser = null;
  applyMenuState(null, null, null);
  hideUserStats();
  updateInteractiveControls();
}

function setLoggedInView() {
  submitTrackBtn.classList.add("hidden");
  showLoginBtn.classList.add("hidden");
  headerAvatarBtn.classList.remove("hidden");
}

function setHeaderAvatar(photoUrl, artistName) {
  if (photoUrl) {
    headerAvatarImage.src = photoUrl;
    headerAvatarImage.classList.remove("hidden");
    headerAvatarFallback.classList.add("hidden");
  } else {
    headerAvatarImage.classList.add("hidden");
    headerAvatarFallback.classList.remove("hidden");
    headerAvatarFallback.textContent = (artistName || "A").charAt(0).toUpperCase();
  }
}

async function loadMyProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("artist_name, photo_url, user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    currentProfileData = null;
    setHeaderAvatar("", "•");
    return null;
  }

  currentProfileData = data;
  setHeaderAvatar(data.photo_url, data.artist_name);
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
    currentTrackData = null;
    return null;
  }

  currentTrackData = data;
  return data;
}

async function refreshAuthUI() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      setLoggedOutView();
      return null;
    }

    const user = data?.session?.user || null;
    currentUser = user;

    if (user) {
      setLoggedInView();

      const profile = await loadMyProfile(user.id);
      const tune = await loadMyTune(user.id);

      applyMenuState(user, profile, tune);
      updateInteractiveControls();
      return user;
    } else {
      setLoggedOutView();
      return null;
    }
  } catch (err) {
    console.error("refreshAuthUI error:", err);
    setLoggedOutView();
    return null;
  }
}

async function loadTrackStats() {
  const { data } = await supabaseClient.auth.getSession();
  const user = data?.session?.user || null;

  if (!user) {
    submittedCardEl.classList.add("hidden");
    playsCardEl.classList.add("hidden");
    return;
  }

  const { count: submittedCount } = await supabaseClient
    .from("tracks")
    .select("*", { count: "exact", head: true });

  const { count: approvedCount } = await supabaseClient
    .from("tracks")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");

  submittedCardEl.classList.remove("hidden");
  submittedCountEl.textContent = (submittedCount || 0).toLocaleString();

  const { count: myApproved } = await supabaseClient
    .from("tracks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "approved");

  if (!myApproved || myApproved === 0) {
    playsCardEl.classList.add("hidden");
    return;
  }

  playsCardEl.classList.remove("hidden");

  const perDay = approvedCount && approvedCount > 0
    ? Math.floor(1440 / approvedCount)
    : 0;

  playsPerDayEl.textContent = perDay.toLocaleString();
}

async function loadMyTotalPlays() {
  const { data } = await supabaseClient.auth.getSession();
  const user = data?.session?.user || null;

  if (!user) {
    myPlaysCardEl.classList.add("hidden");
    return;
  }

  const { data: myTracks, error } = await supabaseClient
    .from("tracks")
    .select("play_count")
    .eq("user_id", user.id);

  if (error || !myTracks || myTracks.length === 0) {
    myPlaysCardEl.classList.add("hidden");
    return;
  }

  let total = 0;
  myTracks.forEach(track => {
    total += track.play_count || 0;
  });

  myPlaysCardEl.classList.remove("hidden");
  myTotalPlaysEl.textContent = total.toLocaleString();
}

async function refreshAuthDependentUI() {
  await refreshAuthUI();
  await loadTrackStats();
  await loadMyTotalPlays();
}

showLoginBtn.onclick = () => {
  closeHeaderPanels();
};

headerAvatarBtn.onclick = () => {
  volumeControl.classList.remove("open");
  accountMenu.classList.toggle("hidden");
};

accountProfileLink.onclick = () => {
  accountMenu.classList.add("hidden");
};

accountNotificationsLink.onclick = () => {
  accountMenu.classList.add("hidden");
};

desktopLogoutBtn.onclick = async () => {
  await handleLogout();
};

volumeBtn.onclick = () => {
  accountMenu.classList.add("hidden");
  volumeControl.classList.toggle("open");
};

document.addEventListener("click", (e) => {
  const insideHeaderRight = e.target.closest(".header-right");
  const insideVolumeWrap = e.target.closest(".volume-wrap");
  const isAvatarButton = e.target.closest("#headerAvatarBtn");

  if (!insideHeaderRight && !isAvatarButton) {
    accountMenu.classList.add("hidden");
  }

  if (!insideVolumeWrap) {
    volumeControl.classList.remove("open");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    accountMenu.classList.add("hidden");
    volumeControl.classList.remove("open");
  }
});

async function handleLogout() {
  logoutBtn.disabled = true;
  desktopLogoutBtn.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    listenerIdentity = null;
    await refreshAuthDependentUI();
  } catch (err) {
    console.error("handleLogout error:", err);
  } finally {
    logoutBtn.disabled = false;
    desktopLogoutBtn.disabled = false;
  }
}

logoutBtn.onclick = handleLogout;

supabaseClient.auth.onAuthStateChange(() => {
  refreshAuthDependentUI().catch(err => console.error(err));
});

function getTrackPreviewStart(track) {
  const value = Number(track?.preview_start_seconds);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function getTrackPreviewDuration(track) {
  const value = Number(track?.preview_duration_seconds);
  return Number.isFinite(value) && value > 0 ? value : 60;
}

async function loadTracksFromSupabase() {
  const { data, error } = await supabaseClient
    .from("tracks")
    .select("id, title, artist, file_url, user_id, play_count, status, created_at, preview_start_seconds, preview_duration_seconds")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadTracksFromSupabase error:", error);
    tracks = [];
    return;
  }

  tracks = (data || []).map(track => ({
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

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderArtist(track) {
  if (track.user_id) {
    artistWrapEl.innerHTML = `
      <a class="artist-link" href="artist.html?user_id=${encodeURIComponent(track.user_id)}">
        ${escapeHtml(track.artist)}
      </a>
    `;
  } else {
    artistWrapEl.innerHTML = `<span>${escapeHtml(track.artist)}</span>`;
  }
}

function resetLike() {
  liked = false;
  likeBtn.innerHTML = `<span class="icon">♥</span>Like`;
  likeBtn.classList.remove("liked");
}

function setTrackUI(track) {
  titleEl.textContent = track.title || "Untitled";
  renderArtist(track);
  currentPreviewStart = getTrackPreviewStart(track);
  currentPreviewDuration = getTrackPreviewDuration(track);
  durationTimeEl.textContent = formatTime(currentPreviewDuration);
  elapsedTimeEl.textContent = "0:00";
  progressFill.style.width = "0%";
  resetLike();
}

function incrementPlayCount(track) {
  if (!track || !track.id) return;

  supabaseClient
    .from("tracks")
    .update({
      play_count: (track.play_count || 0) + 1
    })
    .eq("id", track.id)
    .then(() => {
      track.play_count = (track.play_count || 0) + 1;
    })
    .catch(err => console.error("incrementPlayCount error:", err));
}

function chooseNextTrackIndex() {
  if (!tracks.length) return -1;

  let next;
  do {
    next = Math.floor(Math.random() * tracks.length);
  } while (tracks.length > 1 && next === current);

  return next;
}

function playTrackAt(index, previewOffset = 0, countPlay = true) {
  if (index < 0 || !tracks[index]) return;

  current = index;
  const track = tracks[index];
  const previewStart = getTrackPreviewStart(track);
  const previewDuration = getTrackPreviewDuration(track);
  const safeOffset = Math.max(0, Math.min(previewOffset, Math.max(previewDuration - 0.25, 0)));
  const targetStartTime = previewStart + safeOffset;

  setTrackUI(track);
  audio.src = track.file_url;
  elapsedTimeEl.textContent = formatTime(safeOffset);
  progressFill.style.width = `${previewDuration > 0 ? (safeOffset / previewDuration) * 100 : 0}%`;

  audio.onloadedmetadata = () => {
    const maxStart = Math.max(0, (audio.duration || targetStartTime) - 0.25);
    const clampedStart = Math.min(targetStartTime, maxStart);

    try {
      audio.currentTime = clampedStart;
    } catch (e) {
      console.error("set currentTime error:", e);
    }

    const playPromise = audio.play();
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
  if (!tracks.length) {
    titleEl.textContent = "No live tunes yet";
    artistWrapEl.innerHTML = `<span>Check back soon</span>`;
    progressFill.style.width = "0%";
    elapsedTimeEl.textContent = "0:00";
    durationTimeEl.textContent = "1:00";
    return;
  }

  const nextIndex = chooseNextTrackIndex();
  playTrackAt(nextIndex, previewOffset, countPlay);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

async function getListenerIdentity() {
  const { data } = await supabaseClient.auth.getSession();
  const user = data?.session?.user || null;

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
    if (!isLiveActivated) return;

    if (!listenerIdentity) {
      listenerIdentity = await getListenerIdentity();
    }

    const { error } = await supabaseClient
      .from("listeners")
      .upsert(
        [{
          user_id: listenerIdentity,
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

    if (!error && count !== null) {
      listenersCountEl.textContent = `${count.toLocaleString()} Listeners`;
    } else if (error) {
      console.error("updateListeners error:", error);
    }
  } catch (err) {
    console.error("updateListeners crash:", err);
  }
}

async function bootstrapLiveRadio() {
  await loadTracksFromSupabase();

  if (!tracks.length) {
    titleEl.textContent = "No live tunes yet";
    artistWrapEl.innerHTML = `<span>Check back soon</span>`;
    await updateListeners();
    return;
  }

  audio.volume = Number(volume.value);
  audio.muted = true;
  updateVolumeButtonState();

  const nextIndex = chooseNextTrackIndex();
  if (nextIndex >= 0) {
    const previewDuration = getTrackPreviewDuration(tracks[nextIndex]);
    const randomLiveOffset = Math.floor(Math.random() * Math.max(previewDuration, 1));
    playTrackAt(nextIndex, randomLiveOffset, false);
  }

  liveBooted = true;
  await updateListeners();
}

async function ensureBackgroundPlayback() {
  if (!liveBooted || !audio.src) return;

  if (audio.paused) {
    audio.muted = true;
    updateVolumeButtonState();
    audio.play().catch(() => {});
  }
}

startBtn.onclick = async () => {
  isLiveActivated = true;
  listenerIdentity = null;

  await registerListener();
  await updateListeners();
  await loadTrackStats();
  await loadMyTotalPlays();

  radioShell.classList.remove("pre-live");
  startOverlay.classList.add("hidden");
  updateConceptVisibility();

  if (!audio.src && tracks.length) {
    const nextIndex = chooseNextTrackIndex();
    const previewDuration = nextIndex >= 0 ? getTrackPreviewDuration(tracks[nextIndex]) : 60;
    const randomOffset = Math.floor(Math.random() * Math.max(previewDuration, 1));
    playTrackAt(nextIndex, randomOffset, false);
  }

  if (Number(volume.value) > 0) {
    audio.muted = false;
  }

  updateVolumeButtonState();

  audio.play().catch(err => {
    console.error("Start Radio play error:", err);
  });
};

skipBtn.onclick = () => {
  if (!currentUser) return;
  nextTrack(0, true);
};

likeBtn.onclick = () => {
  if (!currentUser) return;

  liked = !liked;

  if (liked) {
    likeBtn.innerHTML = `<span class="icon">♥</span>Liked`;
    likeBtn.classList.add("liked");
  } else {
    likeBtn.innerHTML = `<span class="icon">♥</span>Like`;
    likeBtn.classList.remove("liked");
  }
};

audio.addEventListener("timeupdate", () => {
  const previewElapsed = Math.max(0, (audio.currentTime || 0) - currentPreviewStart);
  const clampedElapsed = Math.min(previewElapsed, currentPreviewDuration);

  progressFill.style.width = `${currentPreviewDuration > 0 ? (clampedElapsed / currentPreviewDuration) * 100 : 0}%`;
  elapsedTimeEl.textContent = formatTime(clampedElapsed);

  if (previewElapsed >= currentPreviewDuration) {
    nextTrack(0, true);
  }
});

audio.addEventListener("ended", () => {
  nextTrack(0, true);
});

volume.addEventListener("input", (e) => {
  const v = Number(e.target.value);
  audio.volume = v;
  audio.muted = v === 0 || !isLiveActivated;
  updateVolumeButtonState();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && isLiveActivated) {
    registerListener().catch(() => {});
  }
  updateListeners().catch(() => {});
  ensureBackgroundPlayback();
});

window.addEventListener("focus", () => {
  if (isLiveActivated) {
    registerListener().catch(() => {});
  }
  updateListeners().catch(() => {});
  ensureBackgroundPlayback();
});

setInterval(() => {
  if (isLiveActivated && !document.hidden) {
    registerListener();
  }
}, 15000);

setInterval(() => {
  updateListeners();
}, 10000);

setInterval(async () => {
  await loadTracksFromSupabase();
  await ensureBackgroundPlayback();
}, 30000);

async function initPage() {
  setLoggedOutView();
  updateVolumeButtonState();
  updateConceptVisibility();
  await refreshAuthDependentUI();
  await bootstrapLiveRadio();
}

initPage().catch(err => {
  console.error("initPage error:", err);
});
