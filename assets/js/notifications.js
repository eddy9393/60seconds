const { getSupabaseClient, getProfileHref: sharedGetProfileHref, bindRuntimeCurrencySync, applyRuntimeCurrencySnapshotToElement, closeStandardHeaderPanels, setStandardHeaderAvatar, handleStandardHeaderAvatarAction, applyStandardMenuState, setStandardLoggedOutState, setStandardLoggedInState, bindStandardHeaderEvents, fetchProfileByUserId, fetchTrackByUserId, getCurrentUserSafe, setUnreadNotificationsFlag } = window.SSFMApp;
const supabaseClient = getSupabaseClient();

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
    likedLink: document.getElementById("desktopLikedLink"),
    statsLink: document.getElementById("desktopStatsLink"),
    trackLink: document.getElementById("desktopTrackLink")
  },

  mobileNav: {
    loginLink: document.getElementById("mobileLoginLink"),
    profileLink: document.getElementById("mobileProfileLink"),
    notificationsLink: document.getElementById("mobileNotificationsLink"),
    likedLink: document.getElementById("mobileLikedLink"),
    trackLink: document.getElementById("mobileTrackLink")
  }
};

const state = {
  currentProfileData: null,
  currentTrackData: null
};

function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle("hidden", hidden);
}

function closeHeaderPanels() {
  closeStandardHeaderPanels(els);
}

function setCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    if (els.header.currencyValue) els.header.currencyValue.textContent = "0";
    return;
  }

  if (els.header.currencyValue) {
    els.header.currencyValue.textContent = String(Math.max(0, Math.floor(amount)));
  }
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
  applyStandardMenuState(els, user, profile, track, { hideAccountNotifications: true });
}

function setLoggedOutView() {
  setStandardLoggedOutState(els);
  state.currentProfileData = null;
  state.currentTrackData = null;
  applyMenuState(null, null, null);
}

function setLoggedInView() {
  setStandardLoggedInState(els, { coins: state.currentProfileData?.coins || 0 });
}

function setHeaderAvatar(photoUrl, artistName) {
  setStandardHeaderAvatar(els, photoUrl, artistName);
}

async function loadMyProfile(userId) {
  const data = await fetchProfileByUserId(userId, "artist_name, photo_url, user_id, coins");
  const error = null;

  if (error || !data) {
    state.currentProfileData = null;
    setHeaderAvatar("", "•");
    return null;
  }

  state.currentProfileData = data;
  setCurrency(data.coins || 0);
  setHeaderAvatar(data.photo_url, data.artist_name);
  return data;
}

async function loadMyTrack(userId) {
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

async function refreshAuthUI() {
  try {
    const user = await getCurrentUserSafe();

    if (user) {
      setLoggedInView();

      const profile = await loadMyProfile(user.id);
      const track = await loadMyTrack(user.id);

      applyMenuState(user, profile, track);
      return user;
    }

    setLoggedOutView();
    return null;
  } catch (err) {
    console.error("refreshAuthUI error:", err);
    setLoggedOutView();
    return null;
  }
}

async function handleLogout() {
  els.header.logoutBtn.disabled = true;
  els.desktopNav.logoutBtn.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    await refreshAuthUI();
    window.location.href = "index.html";
  } catch (err) {
    console.error("handleLogout error:", err);
  } finally {
    els.header.logoutBtn.disabled = false;
    els.desktopNav.logoutBtn.disabled = false;
  }
}

function bindEvents() {
  bindStandardHeaderEvents(els, {
    onLoginClick: () => {
      window.location.href = "login.html";
    },
    onLogout: handleLogout
  });

  supabaseClient.auth.onAuthStateChange(() => {
    refreshAuthUI().catch((err) => console.error(err));
  });
}

async function initPage() {
  applyRuntimeCurrencySnapshot();

  setLoggedOutView();
  bindEvents();

  const user = await refreshAuthUI();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  setUnreadNotificationsFlag(false);
}

initPage().catch((err) => {
  console.error("initPage error:", err);
});

