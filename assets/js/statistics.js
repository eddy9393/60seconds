
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
    artistPhoto: document.getElementById("statArtistPhoto"),
    artistPhotoFallback: document.getElementById("statArtistPhotoFallback"),
    artistName: document.getElementById("statArtistName"),
    location: document.getElementById("statLocation"),
    roles: document.getElementById("statRoles"),
    coins: document.getElementById("statCoins"),
    dailySeconds: document.getElementById("statDailySeconds"),
    tuneCount: document.getElementById("statTuneCount"),
    totalPlays: document.getElementById("statTotalPlays"),
    estimatedPlays: document.getElementById("statEstimatedPlays"),
    approvedTuneCount: document.getElementById("statApprovedTuneCount"),
    pendingTuneCount: document.getElementById("statPendingTuneCount"),
    trackSummary: document.getElementById("statTrackSummary"),
    city: document.getElementById("statCity"),
    country: document.getElementById("statCountry"),
    rolesDetail: document.getElementById("statRolesDetail"),
    socialLink: document.getElementById("statSocialLink"),
    socialMissing: document.getElementById("statSocialMissing"),
    bio: document.getElementById("statBio")
  }
};

function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle("hidden", hidden);
}

function setText(element, value) {
  if (!element) return;
  element.textContent = value;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function getDisplayRoles(profile) {
  const roles = Array.isArray(profile?.music_roles)
    ? profile.music_roles.filter(Boolean)
    : [];
  if (roles.length) return roles.join(" • ");
  if (String(profile?.music_role || "").trim()) return String(profile.music_role).trim();
  return "Artist";
}

function getDisplayLocation(profile) {
  const city = String(profile?.city || "").trim();
  const country = String(profile?.nationality || "").trim();
  if (city && country) return `${city}, ${country}`;
  return city || country || "No location yet";
}

function setArtistAvatar(profile, user) {
  const photoUrl = String(profile?.photo_url || "").trim();
  const fallback = String(profile?.artist_name || user?.email || "A").trim().charAt(0).toUpperCase() || "A";
  if (photoUrl) {
    els.page.artistPhoto.src = photoUrl;
    els.page.artistPhoto.alt = `${profile?.artist_name || "Artist"} avatar`;
    setHidden(els.page.artistPhoto, false);
    setHidden(els.page.artistPhotoFallback, true);
  } else {
    setText(els.page.artistPhotoFallback, fallback);
    setHidden(els.page.artistPhoto, true);
    setHidden(els.page.artistPhotoFallback, false);
  }
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

  const profile = await fetchProfileByUserId(user.id, "artist_name, photo_url, user_id, coins, daily_seconds_earned, city, nationality, bio, social_link, music_role, music_roles");
  const { data: track } = await supabaseClient.from("tracks").select("id, user_id, title, status, created_at").eq("user_id", user.id).maybeSingle();
  setStandardLoggedInState(els, { coins: profile?.coins || 0 });
  applyStandardMenuState(els, user, profile, track);
  setStandardHeaderAvatar(els, profile?.photo_url, profile?.artist_name || user.email || "A");

  if (!hasCompletedArtistProfile(profile)) {
    setHidden(els.page.loginRequired, true);
    setHidden(els.page.profileRequired, false);
    setHidden(els.page.statsWrap, true);
    return;
  }

  const [
    { data: myTracks, error: tracksError },
    { count: approvedCount },
    { count: stationApprovedCount }
  ] = await Promise.all([
    supabaseClient
      .from("tracks")
      .select("id, title, status, play_count, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabaseClient
      .from("tracks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "approved"),
    supabaseClient
      .from("tracks")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
  ]);

  if (tracksError) {
    console.error("statistics tracks error:", tracksError);
  }

  const tracks = Array.isArray(myTracks) ? myTracks : [];
  const totalTuneCount = tracks.length;
  const pendingCount = tracks.filter((item) => String(item?.status || "") !== "approved").length;
  const totalPlays = tracks.reduce((sum, item) => sum + (Number(item?.play_count) || 0), 0);
  const estimatedPlays = approvedCount && stationApprovedCount
    ? Math.floor(1440 / Math.max(1, Number(stationApprovedCount || 0)))
    : 0;
  const latestTrack = tracks[0] || null;

  setArtistAvatar(profile, user);
  setText(els.page.artistName, profile.artist_name || "—");
  setText(els.page.location, getDisplayLocation(profile));
  setText(els.page.roles, getDisplayRoles(profile));
  setText(els.page.coins, formatNumber(profile.coins || 0));
  setText(els.page.dailySeconds, formatNumber(profile.daily_seconds_earned || 0));
  setText(els.page.tuneCount, formatNumber(totalTuneCount));
  setText(els.page.totalPlays, formatNumber(totalPlays));
  setText(els.page.estimatedPlays, formatNumber(estimatedPlays));
  setText(els.page.approvedTuneCount, formatNumber(approvedCount || 0));
  setText(els.page.pendingTuneCount, formatNumber(pendingCount));
  setText(els.page.city, String(profile.city || "—").trim() || "—");
  setText(els.page.country, String(profile.nationality || "—").trim() || "—");
  setText(els.page.rolesDetail, getDisplayRoles(profile));
  setText(els.page.bio, String(profile.bio || "No artist bio added yet.").trim() || "No artist bio added yet.");

  if (profile?.social_link) {
    els.page.socialLink.href = profile.social_link;
    setHidden(els.page.socialLink, false);
    setHidden(els.page.socialMissing, true);
  } else {
    els.page.socialLink.removeAttribute("href");
    setHidden(els.page.socialLink, true);
    setHidden(els.page.socialMissing, false);
  }

  if (latestTrack) {
    const title = String(latestTrack.title || "Untitled").trim() || "Untitled";
    const status = String(latestTrack.status || "pending").trim() || "pending";
    const plays = Number(latestTrack.play_count || 0);
    setText(els.page.trackSummary, `Latest tune: ${title} · ${status} · ${formatNumber(plays)} plays`);
  } else {
    setText(els.page.trackSummary, "No tune submitted yet.");
  }

  setHidden(els.page.loginRequired, true);
  setHidden(els.page.profileRequired, true);
  setHidden(els.page.statsWrap, false);
}

loadPage().catch((error) => {
  console.error("statistics page error:", error);
});
