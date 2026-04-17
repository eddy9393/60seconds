(function () {
  const ADMIN_EMAIL = "kroonstadt.earvin@gmail.com";
  const supabaseClient = window.SSFMApp.getSupabaseClient();

  const statusEl = document.getElementById("status");
  const debugEl = document.getElementById("debug");
  const trackListEl = document.getElementById("trackList");
  const metricsGridEl = document.getElementById("metricsGrid");
  const lockedBoxEl = document.getElementById("lockedBox");
  const adminAppEl = document.getElementById("adminApp");
  const loadingBoxEl = document.getElementById("loadingBox");

  let currentUser = null;
  let isApproving = false;
  let hasInitialized = false;

  function setStatus(msg, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = isError ? "#ff8a8a" : "#f3f3f3";
  }

  function setDebug(msg) {
    if (!debugEl) return;
    debugEl.textContent = msg || "";
  }

  function showLoading(message = "Loading...") {
    loadingBoxEl.classList.remove("hidden");
    loadingBoxEl.innerHTML = `<div class="loading-text">${escapeHtml(message)}</div>`;
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

  async function loadPendingTracks() {
    if (!currentUser || !isAdminUser(currentUser)) {
      showLocked();
      return;
    }

    setStatus("Loading pending tracks...");
    setDebug("Fetching pending tunes...");

    const { data, error } = await supabaseClient
      .from("tracks")
      .select("id, title, artist, file_url, status, created_at, user_id")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus("Error loading tracks: " + error.message, true);
      return;
    }

    renderTracks(data || []);
  }

  async function loadMetrics() {
    if (!metricsGridEl) return;

    metricsGridEl.innerHTML = `<div class="admin-empty">Loading metrics...</div>`;

    const [
      pendingRes,
      approvedRes,
      artistsRes,
      likesRes,
      playsRes,
      coinsRes
    ] = await Promise.all([
      supabaseClient.from("tracks").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseClient.from("tracks").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabaseClient.from("profiles").select("id", { count: "exact", head: true }).not("artist_name", "is", null).neq("artist_name", ""),
      supabaseClient.from("track_likes").select("id", { count: "exact", head: true }),
      supabaseClient.from("tracks").select("play_count").eq("status", "approved"),
      supabaseClient.from("profiles").select("coins")
    ]);

    const loadErrors = [pendingRes, approvedRes, artistsRes, likesRes, playsRes, coinsRes]
      .map((r) => r.error)
      .filter(Boolean);

    if (loadErrors.length) {
      metricsGridEl.innerHTML = `<div class="admin-empty">Could not load all metrics right now.</div>`;
      setDebug(loadErrors[0].message || "Metric load failed");
      return;
    }

    const totalPlays = (playsRes.data || []).reduce((sum, row) => sum + Number(row.play_count || 0), 0);
    const secondsInCirculation = (coinsRes.data || []).reduce((sum, row) => sum + Number(row.coins || 0), 0);

    const metrics = [
      {
        label: "Pending approvals",
        value: pendingRes.count || 0,
        footnote: "Tunes waiting for your decision right now."
      },
      {
        label: "Approved tunes",
        value: approvedRes.count || 0,
        footnote: "Tracks currently approved for the station."
      },
      {
        label: "Live artist profiles",
        value: artistsRes.count || 0,
        footnote: "Profiles with an active artist name on the platform."
      },
      {
        label: "Total platform likes",
        value: likesRes.count || 0,
        footnote: "All likes recorded across every tune."
      },
      {
        label: "Total radio plays",
        value: totalPlays,
        footnote: "Combined approved tune play count."
      },
      {
        label: "Seconds in circulation",
        value: secondsInCirculation,
        footnote: "Current balance summed across all artist profiles."
      }
    ];

    metricsGridEl.innerHTML = metrics.map((metric) => `
      <article class="admin-metric-card">
        <div class="admin-metric-label">${escapeHtml(metric.label)}</div>
        <div class="admin-metric-value">${formatNumber(metric.value)}</div>
        <div class="admin-metric-footnote">${escapeHtml(metric.footnote)}</div>
      </article>
    `).join("");
  }

  function renderTracks(tracks) {
    trackListEl.innerHTML = "";

    if (!tracks.length) {
      trackListEl.innerHTML = `<div class="admin-empty">No pending tracks right now.</div>`;
      setStatus("No pending tracks found.");
      return;
    }

    setStatus(`${tracks.length} pending tune(s) found.`);

    tracks.forEach((tune) => {
      const createdAt = tune.created_at ? new Date(`1970-01-01T${String(tune.created_at).replace(' ', '')}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Unknown";
      const safeTitle = escapeHtml(tune.title || "Untitled");
      const safeArtist = escapeHtml(tune.artist || "Unknown");
      const safeTrackId = escapeHtml(tune.id || "");
      const safeUserId = escapeHtml(tune.user_id || "");
      const safeAudioUrl = escapeHtml(tune.file_url || "");

      const div = document.createElement("article");
      div.className = "admin-track-card";
      div.innerHTML = `
        <div>
          <h3 class="admin-track-title">${safeTitle}</h3>
          <p><strong>Artist:</strong> ${safeArtist}</p>
          <div class="admin-track-meta">
            <span class="admin-pill">Pending</span>
            <span class="admin-pill">Submitted ${escapeHtml(createdAt)}</span>
          </div>
          <div class="admin-track-aux">
            <span class="admin-pill">Track ID ${safeTrackId}</span>
            <span class="admin-pill">User ${safeUserId}</span>
          </div>
        </div>
        <div class="admin-track-actions">
          <audio controls preload="none" src="${safeAudioUrl}"></audio>
          <button class="admin-approve-btn" type="button" data-id="${safeTrackId}" data-action="approve">Approve tune</button>
        </div>
      `;
      trackListEl.appendChild(div);
    });

    wireButtons();
  }

  function wireButtons() {
    const buttons = document.querySelectorAll("button[data-action='approve']");
    buttons.forEach((button) => {
      button.addEventListener("click", async () => {
        if (isApproving) return;
        const id = button.getAttribute("data-id");
        await approveTrack(id, button);
      });
    });
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
    setDebug("Updating tune status to approved for " + trackId);

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

    setStatus("Tune approved ✅");
    await Promise.all([loadPendingTracks(), loadMetrics()]);
    isApproving = false;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(Number(value || 0));
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function init() {
    showLoading("Checking admin access...");
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) {
      hasInitialized = true;
      return;
    }
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

  init();
})();
