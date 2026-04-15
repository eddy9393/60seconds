
const { getSupabaseClient, bindRuntimeCurrencySync, setStandardHeaderAvatar, applyStandardMenuState, setStandardLoggedOutState, setStandardLoggedInState, bindStandardHeaderEvents, fetchProfileByUserId, getCurrentUserSafe, hasCompletedArtistProfile } = window.SSFMApp;
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
    loginRequired: document.getElementById("statsLoginRequired"),
    profileRequired: document.getElementById("statsProfileRequired"),
    statsWrap: document.getElementById("statsWrap"),
    artistName: document.getElementById("statArtistName"),
    coins: document.getElementById("statCoins"),
    dailySeconds: document.getElementById("statDailySeconds"),
    tuneCount: document.getElementById("statTuneCount")
  }
};

function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle("hidden", hidden);
}

bindRuntimeCurrencySync(els.header?.currencyValue, els.header?.currencyBadge);

bindStandardHeaderEvents(els, {
  onLogout: async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  }
});

async function loadPage() {
  const user = await getCurrentUserSafe();
  if (!user) {
    setStandardLoggedOutState(els);
    setHidden(els.page.loginRequired, false);
    setHidden(els.page.profileRequired, true);
    setHidden(els.page.statsWrap, true);
    return;
  }

  const profile = await fetchProfileByUserId(user.id, "artist_name, photo_url, user_id, coins, daily_seconds_earned");
  const { data: track } = await supabaseClient.from("tracks").select("id, user_id, title").eq("user_id", user.id).maybeSingle();
  setStandardLoggedInState(els, { coins: profile?.coins || 0 });
  applyStandardMenuState(els, user, profile, track);
  setStandardHeaderAvatar(els, profile?.photo_url, profile?.artist_name || user.email || "A");

  if (!hasCompletedArtistProfile(profile)) {
    setHidden(els.page.loginRequired, true);
    setHidden(els.page.profileRequired, false);
    setHidden(els.page.statsWrap, true);
    return;
  }

  const { count } = await supabaseClient
    .from("tracks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  els.page.artistName.textContent = profile.artist_name || "—";
  els.page.coins.textContent = String(profile.coins || 0);
  els.page.dailySeconds.textContent = String(profile.daily_seconds_earned || 0);
  els.page.tuneCount.textContent = String(count || 0);

  setHidden(els.page.loginRequired, true);
  setHidden(els.page.profileRequired, true);
  setHidden(els.page.statsWrap, false);
}

loadPage().catch((error) => {
  console.error("statistics page error:", error);
});
