(function () {
  const ADMIN_EMAIL = "kroonstadt.earvin@gmail.com";
  const supabaseClient = window.SSFMApp.getSupabaseClient();

  const statusEl = document.getElementById("status");
  const debugEl = document.getElementById("debug");
  const trackListEl = document.getElementById("trackList");
  const metricListEl = document.getElementById("metricList");
  const lockedBoxEl = document.getElementById("lockedBox");
  const adminAppEl = document.getElementById("adminApp");
  const loadingBoxEl = document.getElementById("loadingBox");
  const loadingTextEl = document.getElementById("loadingText");

  let currentUser = null;
  let isApproving = false;
  let hasInitialized = false;

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(Number(value || 0));
  }

  function setStatus(msg, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.style.color = isError ? "var(--danger)" : "var(--muted)";
  }

  function setDebug(msg) {
    if (!debugEl) return;
    debugEl.textContent = msg || "";
  }

  function showLoading(message = "Loading...") {
    if (loadingTextEl) loadingTextEl.textContent = message;
    loadingBoxEl.classList.remove("hidden");
    lockedBoxEl.classList.add("hidden");
    adminAppEl.classList.add("hidden");
  }

  function showLocked() {
    loadingBoxEl.classList.add("hidden");
    lockedBoxEl.classList.remove("hidden");
    adminAppEl.classList.add("hidden");
  }

  function showAdmin() {
    loadingBoxEl.classList.add("hidden");
    lockedBoxEl.classList.add("hidden");
    adminAppEl.classList.remove("hidden");
  }

  function isAdminUser(user) {
    return Boolean(user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  }

  async function getFastSessionUser() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      setDebug("getSession error: " + error.message);
      return null;
    }
    return data?.session?.user || null;
  }

  async function validateUserFallback() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) {
      setDebug("getUser error: " + error.message);
      return null;
    }
    return data?.user || null;
  }

  async function checkAdminAccess() {
    setDebug("Checking logged-in admin...");
    let user = await getFastSessionUser();

    if (!user) {
      setDebug("No fast session found, checking with getUser...");
      user = await validateUserFallback();
    }

    currentUser = user;

    if (!user || !isAdminUser(user)) {
      showLocked();
      return false;
    }

    showAdmin();
    return true;
  }

  function normalizeSnapshot(raw) {
    const snapshot = Array.isArray(raw) ? (raw[0] || {}) : (raw || {});
    return {
      uniqueVisitorsToday: snapshot.uniqueVisitorsToday ?? snapshot.unique_visitors_today ?? 0,
      uniqueVisitors7d: snapshot.uniqueVisitors7d ?? snapshot.unique_visitors_7d ?? 0,
      uniqueVisitors30d: snapshot.uniqueVisitors30d ?? snapshot.unique_visitors_30d ?? 0,
      returningVisitors30d: snapshot.returningVisitors30d ?? snapshot.returning_visitors_30d ?? 0,
      profilesTotal: snapshot.profilesTotal ?? snapshot.total_profiles ?? 0,
      liveProfiles: snapshot.liveProfiles ?? snapshot.live_artist_profiles ?? 0,
      pendingTracks: snapshot.pendingTracks ?? snapshot.pending_tracks ?? 0,
      approvedTracks: snapshot.approvedTracks ?? snapshot.approved_tracks ?? 0,
      totalPlatformLikes: snapshot.totalPlatformLikes ?? snapshot.total_platform_likes ?? 0,
      topPageToday: snapshot.topPageToday ?? snapshot.top_page_today ?? "/"
    };
  }

  function renderMetrics(rawSnapshot) {
    if (!metricListEl) return;

    const snapshot = normalizeSnapshot(rawSnapshot);
    const rows = [
      ["Unique visitors today", snapshot.uniqueVisitorsToday],
      ["Unique visitors (7 days)", snapshot.uniqueVisitors7d],
      ["Unique visitors (30 days)", snapshot.uniqueVisitors30d],
      ["Returning visitors (30 days)", snapshot.returningVisitors30d],
      ["Profiles on the platform", snapshot.profilesTotal],
      ["Live artist profiles", snapshot.liveProfiles],
      ["Pending tracks", snapshot.pendingTracks],
      ["Approved tracks", snapshot.approvedTracks],
      ["Total platform likes", snapshot.totalPlatformLikes],
      ["Top page today", snapshot.topPageToday || "/"]
    ];

    metricListEl.innerHTML = rows.map(([label, value]) => `
      <li class="metric-row">
        <span class="metric-label">${escapeHtml(label)}</span>
        <span class="metric-value">${typeof value === "number" ? formatNumber(value) : escapeHtml(String(value))}</span>
      </li>
    `).join("");
  }

  async function loadMetrics() {
    if (!metricListEl) return;
    metricListEl.innerHTML = '<li class="empty">Loading admin metrics...</li>';

    const { data, error } = await supabaseClient.rpc("get_admin_traffic_snapshot");

    if (error) {
      setDebug("metrics error: " + error.message);
      metricListEl.innerHTML = '<li class="empty">Could not load admin metrics right now.</li>';
      return;
    }

    renderMetrics(data);
  }

  function renderTracks(tracks) {
    trackListEl.innerHTML = "";

    if (!tracks.length) {
      trackListEl.innerHTML = '<div class="empty">No pending tracks right now.</div>';
      setStatus("No pending tunes waiting for approval.");
      return;
    }

    setStatus(`${tracks.length} pending tune(s) waiting for approval.`);

    tracks.forEach((track) => {
      const createdAt = track.created_at ? new Date(track.created_at).toLocaleString() : "Unknown";
      const article = document.createElement("article");
      article.className = "track-item";
      article.innerHTML = `
        <div class="track-head">
          <div>
            <h3 class="track-title">${escapeHtml(track.title || "Untitled")}</h3>
            <p class="track-meta">Artist: ${escapeHtml(track.artist || "Unknown")}</p>
            <p class="track-id">ID: ${escapeHtml(track.id || "")} · Submitted: ${escapeHtml(createdAt)}</p>
          </div>
          <div class="track-status">pending</div>
        </div>
        <audio controls preload="none" src="${escapeHtml(track.file_url || "")}"></audio>
        <button class="approve-btn" type="button" data-action="approve" data-id="${escapeHtml(track.id || "")}">Approve tune</button>
      `;
      trackListEl.appendChild(article);
    });

    document.querySelectorAll("[data-action='approve']").forEach((button) => {
      button.addEventListener("click", async () => {
        if (isApproving) return;
        await approveTrack(button.getAttribute("data-id"), button);
      });
    });
  }

  async function loadPendingTracks() {
    if (!currentUser || !isAdminUser(currentUser)) {
      showLocked();
      return;
    }

    setStatus("Loading pending tracks...");

    const { data, error } = await supabaseClient
      .from("tracks")
      .select("id, title, artist, file_url, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus("Could not load pending tracks: " + error.message, true);
      return;
    }

    renderTracks(data || []);
  }

  async function approveTrack(trackId, buttonEl) {
    if (!trackId) return;

    isApproving = true;
    const originalText = buttonEl ? buttonEl.textContent : "Approve tune";

    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.textContent = "Approving...";
    }

    setStatus("Approving tune...");

    const { error } = await supabaseClient
      .from("tracks")
      .update({ status: "approved" })
      .eq("id", trackId);

    if (error) {
      setStatus("Approve failed: " + error.message, true);
      if (buttonEl) {
        buttonEl.disabled = false;
        buttonEl.textContent = originalText;
      }
      isApproving = false;
      return;
    }

    setStatus("Tune approved.");
    await Promise.all([loadPendingTracks(), loadMetrics()]);
    isApproving = false;
  }

  async function init() {
    showLoading("Checking admin access...");
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) {
      hasInitialized = true;
      return;
    }
    showLoading("Loading admin data...");
    showAdmin();
    await Promise.all([loadPendingTracks(), loadMetrics()]);
    hasInitialized = true;
  }

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    if (!hasInitialized) return;
    if (!currentUser || !isAdminUser(currentUser)) {
      showLocked();
      return;
    }
    showAdmin();
    await Promise.all([loadPendingTracks(), loadMetrics()]);
  });

  document.addEventListener("DOMContentLoaded", init);
})();