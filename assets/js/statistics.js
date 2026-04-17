const {
  getSupabaseClient,
  bindRuntimeCurrencySync,
  setStandardHeaderAvatar,
  applyStandardMenuState,
  setStandardLoggedOutState,
  setStandardLoggedInState,
  bindStandardHeaderEvents,
  fetchProfileByUserId,
  getCurrentUserSafe,
  hasCompletedArtistProfile
} = window.SSFMApp;

const supabaseClient = getSupabaseClient();

const els = {
  header: {
    showLoginBtn: document.getElementById("showLoginBtn"),
    headerAvatarBtn: document.getElementById("headerAvatarBtn"),
    headerAvatarImage: document.getElementById("headerAvatarImage"),
    headerAvatarFallback: document.getElementById("headerAvatarFallback"),
    accountMenu: document.getElementById("accountMenu"),
    accountProfileLink: document.getElementById("accountProfileLink"),
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
    currentTune: document.getElementById("statCurrentTune"),
    totalPlays: document.getElementById("statTotalPlays"),
    estimatedPlays: document.getElementById("statEstimatedPlays"),
    totalLikes: document.getElementById("statTotalLikes"),
    profileVisits: document.getElementById("statProfileVisits"),
    coins: document.getElementById("statCoins"),
    totalEarned: document.getElementById("statTotalEarned"),
    metricSelect: document.getElementById("statsMetricSelect"),
    trendNote: document.getElementById("statsTrendNote"),
    trendCanvas: document.getElementById("statsTrendCanvas"),
    trendEmpty: document.getElementById("statsTrendEmpty")
  }
};

const state = {
  profile: null,
  user: null,
  track: null,
  chartDataByMetric: {
    streams: [],
    visits: [],
    likes: []
  },
  firstAvailableByMetric: {
    streams: null,
    visits: null,
    likes: null
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

async function fetchTotalEarnedSeconds(userId, profile) {
  if (!userId) return 0;
  return Math.max(0, Number(profile?.lifetime_seconds_earned) || 0);
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

function normalizeUtcDateInput(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function eachDateInclusive(startDate, endDate) {
  const result = [];
  let cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

function buildSeriesMap(rows, keyName, dateName = "stat_date") {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const date = normalizeUtcDateInput(row?.[dateName]);
    if (!date) return;
    const existing = Number(map.get(date) || 0);
    map.set(date, existing + (Number(row?.[keyName]) || 0));
  });
  return map;
}

function buildDailyCountMapFromRows(rows, dateField = "created_at") {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const date = normalizeUtcDateInput(row?.[dateField]);
    if (!date) return;
    map.set(date, Number(map.get(date) || 0) + 1);
  });
  return map;
}

function buildSeriesFromRange(startDate, endDate, dailyMap) {
  if (!startDate || !endDate) return [];
  return eachDateInclusive(startDate, endDate).map((date) => ({
    date,
    value: Number(dailyMap.get(date) || 0)
  }));
}

function formatAxisDate(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC"
  });
}

function getTodayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function drawLineChart(series) {
  const canvas = els.page.trendCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fillRect(0, 0, width, height);

  if (!Array.isArray(series) || !series.length) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "500 20px Space Grotesk";
    ctx.fillText("No data yet", 36, height / 2);
    return;
  }

  const padding = { top: 30, right: 26, bottom: 56, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...series.map((point) => Number(point.value) || 0), 1);
  const ySteps = 4;

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let step = 0; step <= ySteps; step += 1) {
    const y = padding.top + (chartHeight * step) / ySteps;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const value = Math.round(maxValue - (maxValue * step) / ySteps);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "500 14px Manrope";
    ctx.fillText(String(value), 16, y + 4);
  }

  const points = series.map((point, index) => {
    const x = padding.left + (chartWidth * index) / Math.max(1, series.length - 1);
    const y = padding.top + chartHeight - ((Number(point.value) || 0) / maxValue) * chartHeight;
    return { ...point, x, y };
  });

  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, "rgba(212,175,55,0.36)");
  gradient.addColorStop(1, "rgba(212,175,55,0.02)");

  ctx.beginPath();
  ctx.moveTo(points[0].x, height - padding.bottom);
  points.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 3;
  ctx.stroke();

  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#f6dd8a";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  const labelIndexes = Array.from(new Set([
    0,
    Math.floor((series.length - 1) / 2),
    series.length - 1
  ].filter((index) => index >= 0)));

  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = "500 14px Manrope";
  labelIndexes.forEach((index) => {
    const point = points[index];
    const label = formatAxisDate(point.date);
    const textWidth = ctx.measureText(label).width;
    ctx.fillText(label, Math.max(0, Math.min(width - textWidth, point.x - textWidth / 2)), height - 18);
  });
}

function updateTrendNote(metric) {
  const firstAvailable = state.firstAvailableByMetric[metric];
  const tuneStart = normalizeUtcDateInput(state.track?.created_at);
  const labels = {
    streams: "Radio stream analytics",
    visits: "Profile visit analytics",
    likes: "Like analytics"
  };

  if (!firstAvailable) {
    setText(els.page.trendNote, `${labels[metric]} will appear once data starts coming in.`);
    return;
  }

  if (tuneStart && firstAvailable > tuneStart && metric !== "likes") {
    setText(els.page.trendNote, `${labels[metric]} started tracking on ${formatAxisDate(firstAvailable)}.`);
    return;
  }

  setText(els.page.trendNote, `${labels[metric]} shown over time.`);
}

function renderTrendChart() {
  const metric = els.page.metricSelect?.value || "streams";
  const series = state.chartDataByMetric[metric] || [];
  updateTrendNote(metric);
  setHidden(els.page.trendEmpty, series.length > 0);
  drawLineChart(series);
}

async function loadTrendData(userId, track) {
  const trackId = track?.id;
  const trackCreatedDate = normalizeUtcDateInput(track?.created_at) || getTodayUtcDate();
  const today = getTodayUtcDate();

  const [trackDailyResult, profileDailyResult, likesResult] = await Promise.all([
    trackId
      ? supabaseClient
          .from("track_daily_stats")
          .select("stat_date, radio_streams, likes")
          .eq("track_id", trackId)
          .order("stat_date", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabaseClient
      .from("profile_daily_stats")
      .select("stat_date, profile_visits")
      .eq("profile_user_id", userId)
      .order("stat_date", { ascending: true }),
    trackId
      ? supabaseClient
          .from("track_likes")
          .select("created_at")
          .eq("track_id", trackId)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null })
  ]);

  if (trackDailyResult?.error) console.error("statistics track_daily_stats error:", trackDailyResult.error);
  if (profileDailyResult?.error) console.error("statistics profile_daily_stats error:", profileDailyResult.error);
  if (likesResult?.error) console.error("statistics track_likes error:", likesResult.error);

  const trackDailyRows = Array.isArray(trackDailyResult?.data) ? trackDailyResult.data : [];
  const profileDailyRows = Array.isArray(profileDailyResult?.data) ? profileDailyResult.data : [];
  const likeRows = Array.isArray(likesResult?.data) ? likesResult.data : [];

  const streamMap = buildSeriesMap(trackDailyRows, "radio_streams");
  const visitMap = buildSeriesMap(profileDailyRows, "profile_visits");
  const likeMapFromDaily = buildSeriesMap(trackDailyRows, "likes");
  const likeMapFromEvents = buildDailyCountMapFromRows(likeRows, "created_at");
  const finalLikeMap = likeMapFromDaily.size ? likeMapFromDaily : likeMapFromEvents;

  const firstStreamDate = Array.from(streamMap.keys()).sort()[0] || null;
  const firstVisitDate = Array.from(visitMap.keys()).sort()[0] || null;
  const firstLikeDate = Array.from(finalLikeMap.keys()).sort()[0] || null;

  state.chartDataByMetric.streams = buildSeriesFromRange(firstStreamDate || trackCreatedDate, today, streamMap).filter((point) => firstStreamDate ? point.date >= firstStreamDate : false);
  state.chartDataByMetric.visits = buildSeriesFromRange(firstVisitDate || trackCreatedDate, today, visitMap).filter((point) => firstVisitDate ? point.date >= firstVisitDate : false);
  state.chartDataByMetric.likes = buildSeriesFromRange(firstLikeDate || trackCreatedDate, today, finalLikeMap).filter((point) => firstLikeDate ? point.date >= firstLikeDate : false);

  state.firstAvailableByMetric.streams = firstStreamDate;
  state.firstAvailableByMetric.visits = firstVisitDate;
  state.firstAvailableByMetric.likes = firstLikeDate;

  let totalLikes = Array.from(finalLikeMap.values()).reduce((sum, value) => sum + Number(value || 0), 0);

  const { count: artistLikeCount, error: artistLikesCountError } = await supabaseClient
    .from("track_likes")
    .select("id", { count: "exact", head: true })
    .eq("artist_user_id", userId);

  if (artistLikesCountError) {
    console.error("statistics total likes artist count error:", artistLikesCountError);
  } else if (Number.isFinite(Number(artistLikeCount))) {
    totalLikes = Number(artistLikeCount) || 0;
  }

  if (!totalLikes && likeRows.length) {
    totalLikes = likeRows.length;
  }

  const totalVisits = Array.from(visitMap.values()).reduce((sum, value) => sum + Number(value || 0), 0);

  setText(els.page.totalLikes, formatNumber(totalLikes));
  setText(els.page.profileVisits, formatNumber(totalVisits));
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

  const profile = await fetchProfileByUserId(user.id, "artist_name, photo_url, user_id, coins, lifetime_seconds_earned, city, nationality, music_role, music_roles");
  const { data: track } = await supabaseClient
    .from("tracks")
    .select("id, user_id, title, status, created_at, play_count")
    .eq("user_id", user.id)
    .maybeSingle();

  state.user = user;
  state.profile = profile || null;
  state.track = track || null;

  setStandardLoggedInState(els, { coins: profile?.coins || 0 });
  applyStandardMenuState(els, user, profile, track);
  setStandardHeaderAvatar(els, profile?.photo_url, profile?.artist_name || user.email || "A");

  if (!hasCompletedArtistProfile(profile)) {
    setHidden(els.page.loginRequired, true);
    setHidden(els.page.profileRequired, false);
    setHidden(els.page.statsWrap, true);
    return;
  }

  const [{ count: ownApprovedCount }, { count: stationApprovedCount }, totalEarnedSeconds] = await Promise.all([
    supabaseClient.from("tracks").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "approved"),
    supabaseClient.from("tracks").select("*", { count: "exact", head: true }).eq("status", "approved"),
    fetchTotalEarnedSeconds(user.id, profile)
  ]);

  const estimatedPlays = ownApprovedCount && stationApprovedCount
    ? Math.floor(1440 / Math.max(1, Number(stationApprovedCount || 0)))
    : 0;

  setArtistAvatar(profile, user);
  setText(els.page.artistName, profile?.artist_name || "—");
  setText(els.page.location, getDisplayLocation(profile));
  setText(els.page.roles, getDisplayRoles(profile));
  setText(els.page.currentTune, track?.title ? track.title : "No tune submitted yet");
  setText(els.page.totalPlays, formatNumber(track?.play_count || 0));
  setText(els.page.estimatedPlays, formatNumber(estimatedPlays));
  setText(els.page.coins, formatNumber(profile?.coins || 0));
  setText(els.page.totalEarned, formatNumber(totalEarnedSeconds));

  await loadTrendData(user.id, track);
  renderTrendChart();

  setHidden(els.page.loginRequired, true);
  setHidden(els.page.profileRequired, true);
  setHidden(els.page.statsWrap, false);
}

if (els.page.metricSelect) {
  els.page.metricSelect.addEventListener("change", renderTrendChart);
}

window.addEventListener("resize", () => {
  renderTrendChart();
});

loadPage().catch((error) => {
  console.error("statistics page error:", error);
});
