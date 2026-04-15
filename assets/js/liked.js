
const { getSupabaseClient, bindRuntimeCurrencySync, setStandardHeaderAvatar, applyStandardMenuState, setStandardLoggedOutState, setStandardLoggedInState, bindStandardHeaderEvents, fetchProfileByUserId, getCurrentUserSafe, fetchLikedTrackIds } = window.SSFMApp;
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
  },
  page: {
    loginRequired: document.getElementById("likedLoginRequired"),
    emptyState: document.getElementById("likedEmptyState"),
    listWrap: document.getElementById("likedListWrap"),
    list: document.getElementById("likedList")
  }
};

function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle("hidden", hidden);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderRows(rows) {
  els.page.list.innerHTML = "";
  rows.forEach((track, index) => {
    const row = document.createElement("div");
    row.className = "playlist-row";
    const genres = [track.genre_primary, track.genre_secondary].filter(Boolean);
    row.innerHTML = `
      <div class="playlist-index">${index + 1}</div>
      <div>
        <div class="playlist-title">${escapeHtml(track.title || "Untitled tune")}</div>
      </div>
      <div>
        <div class="playlist-title">${escapeHtml(track.artist || "Artist")}</div>
      </div>
      <div>${genres.length ? genres.map((genre) => `<span class="playlist-pill">${escapeHtml(genre)}</span>`).join(" ") : `<span class="playlist-pill">No genre yet</span>`}</div>
      <div class="playlist-actions">
        <a class="playlist-open" href="artist.html?user_id=${encodeURIComponent(track.user_id)}">Visit artist</a>
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

  const likedIds = await fetchLikedTrackIds(user.id);
  if (!likedIds.length) {
    setHidden(els.page.loginRequired, true);
    setHidden(els.page.emptyState, false);
    setHidden(els.page.listWrap, true);
    return;
  }

  const { data, error } = await supabaseClient
    .from("tracks")
    .select("id, user_id, title, artist, genre_primary, genre_secondary")
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
