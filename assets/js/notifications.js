const supabaseClient = window.supabase.createClient(
  "https://rgoutegbcpjytplqcwze.supabase.co",
  "sb_publishable_255qyDKS77nMU0pbedfa_A_3hdgtEHh"
);

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
  setHidden(els.header.accountMenu, true);
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

function getProfileHref(profile) {
  if (!profile) return "join.html";
  if (profile?.user_id) {
    return `artist.html?user_id=${encodeURIComponent(profile.user_id)}`;
  }
  return "join.html";
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
  setHidden(els.header.accountNotificationsLink, true);

  els.desktopNav.trackLink.setAttribute("data-track-mode", hasTrack ? "edit" : "submit");
  els.mobileNav.trackLink.setAttribute("data-track-mode", hasTrack ? "edit" : "submit");
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
  setHidden(els.header.currencyBadge, true);
  setCurrency(0);

  state.currentProfileData = null;
  state.currentTrackData = null;

  applyMenuState(null, null, null);
}

function setLoggedInView() {
  setHidden(els.header.showLoginBtn, true);
  setHidden(els.header.headerAvatarBtn, false);
  setHidden(els.header.accountMenu, true);
  setHidden(els.header.currencyBadge, false);
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
  els.header.headerAvatarFallback.textContent = (artistName || "A").charAt(0).toUpperCase();
}

async function loadMyProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("artist_name, photo_url, user_id, coins")
    .eq("user_id", userId)
    .maybeSingle();

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
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      setLoggedOutView();
      return null;
    }

    const user = data?.session?.user || null;

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

  els.desktopNav.logoutBtn.onclick = async () => {
    await handleLogout();
  };

  els.header.logoutBtn.onclick = handleLogout;

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
    refreshAuthUI().catch((err) => console.error(err));
  });
}

async function initPage() {
  setLoggedOutView();
  bindEvents();

  const user = await refreshAuthUI();

  if (!user) {
    window.location.href = "login.html";
  }
}

initPage().catch((err) => {
  console.error("initPage error:", err);
});
