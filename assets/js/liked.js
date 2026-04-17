
const { getSupabaseClient, getProfileHref: sharedGetProfileHref, bindRuntimeCurrencySync, applyRuntimeCurrencySnapshotToElement, closeStandardHeaderPanels, setStandardHeaderAvatar, handleStandardHeaderAvatarAction, applyStandardMenuState, setStandardLoggedOutState, setStandardLoggedInState, bindStandardHeaderEvents, fetchProfileByUserId, getCurrentUserSafe } = window.SSFMApp;
const supabaseClient = getSupabaseClient();
const LIKE_KEY = 'ssfm_radio_likes_v2';

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
  },
  page: {
    loginRequired: document.getElementById("likedLoginRequired"),
    emptyState: document.getElementById("likedEmptyState"),
    listWrap: document.getElementById("likedListWrap"),
    list: document.getElementById("likedList")
  }
};

function getProfileHref(profile) {
  return sharedGetProfileHref(profile);
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

function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle("hidden", hidden);
}

function renderRows(rows) {
  els.page.list.innerHTML = "";
  rows.forEach((track, index) => {
    const row = document.createElement("div");
    row.className = "playlist-row";
    const genres = [track.genre_primary, track.genre_secondary].filter(Boolean).join(" / ") || "—";
    row.innerHTML = `
      <div class="playlist-index">${index + 1}</div>
      <div>
        <div class="playlist-title">${track.title || "Untitled tune"}</div>
        <div class="playlist-sub"></div>
      </div>
      <div>
        <div class="playlist-title">${track.artist || "Artist"}</div>
        
      </div>
      <div><span class="playlist-pill">${genres}</span></div>
      <div class="playlist-actions">
        <a class="playlist-open" href="artist.html?user_id=${encodeURIComponent(track.user_id)}">Go To Artist</a>
      </div>
    `;
    els.page.list.appendChild(row);
  });
}

async function loadPage() {
  const user = await getCurrentUserSafe();
  if (!user) {
    setStandardLoggedOutState(els);
    setHidden(els.page.loginRequired, false);
    setHidden(els.page.emptyState, true);
    setHidden(els.page.listWrap, true);
    return;
  }

  const profile = await fetchProfileByUserId(user.id, "artist_name, photo_url, user_id, coins");
  const { data: track } = await supabaseClient.from("tracks").select("id, user_id, title, status").eq("user_id", user.id).maybeSingle();
  setStandardLoggedInState(els, { coins: profile?.coins || 0 });
  applyStandardMenuState(els, user, profile, track);
  setStandardHeaderAvatar(els, profile?.photo_url, profile?.artist_name || user.email || "A");

  const { data: likeRows, error: likeRowsError } = await supabaseClient
    .from("track_likes")
    .select("track_id, created_at")
    .eq("liker_user_id", user.id)
    .order("created_at", { ascending: false });

  const likedIds = Array.isArray(likeRows) ? likeRows.map((row) => String(row.track_id)).filter(Boolean) : [];

  if (likeRowsError || !likedIds.length) {
    setHidden(els.page.loginRequired, true);
    setHidden(els.page.emptyState, false);
    setHidden(els.page.listWrap, true);
    return;
  }

  const { data, error } = await supabaseClient
    .from("tracks")
    .select("id, user_id, title, artist, genre_primary, genre_secondary, status")
    .in("id", likedIds);

  if (error || !data || !data.length) {
    setHidden(els.page.loginRequired, true);
    setHidden(els.page.emptyState, false);
    setHidden(els.page.listWrap, true);
    return;
  }

  const ordered = likedIds.map((id) => data.find((row) => String(row.id) === String(id))).filter(Boolean);
  renderRows(ordered);
  setHidden(els.page.loginRequired, true);
  setHidden(els.page.emptyState, true);
  setHidden(els.page.listWrap, false);
}

bindRuntimeCurrencySync(els.header?.currencyValue, els.header?.currencyBadge);
bindStandardHeaderEvents(els, {
  onLogout: async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  }
});

loadPage().catch((error) => {
  console.error("liked page error:", error);
});
