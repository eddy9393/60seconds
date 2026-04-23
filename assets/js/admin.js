(function () {
  const ADMIN_EMAIL = 'kroonstadt.earvin@gmail.com';
  const supabaseClient = window.SSFMApp.getSupabaseClient();

  const loadingBoxEl = document.getElementById('loadingBox');
  const loadingTextEl = document.getElementById('loadingText');
  const lockedBoxEl = document.getElementById('lockedBox');
  const adminAppEl = document.getElementById('adminApp');
  const statusEl = document.getElementById('status');
  const debugEl = document.getElementById('debug');
  const trackListEl = document.getElementById('trackList');
  const metricListEl = document.getElementById('metricList');
  const metricSummaryEl = document.getElementById('metricSummary');
  const metricChartEl = document.getElementById('metricChart');
  const queueBadgeEl = document.getElementById('queueBadge');
  const metricTabs = Array.from(document.querySelectorAll('[data-metric-filter]'));

  let currentUser = null;
  let hasInitialized = false;
  let isApproving = false;
  let currentMetricFilter = 'traffic';
  let currentMetricSnapshot = null;

  function escapeHtml(value) {
    if (window.SSFMApp && typeof window.SSFMApp.escapeHtml === 'function') {
      return window.SSFMApp.escapeHtml(value);
    }
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.style.color = isError ? 'var(--danger)' : 'var(--muted)';
  }

  function setDebug(message) {
    if (!debugEl) return;
    debugEl.textContent = message || '';
  }

  function showLoading(message) {
    if (loadingTextEl) loadingTextEl.textContent = message || 'Loading...';
    if (loadingBoxEl) loadingBoxEl.classList.remove('hidden');
    if (lockedBoxEl) lockedBoxEl.classList.add('hidden');
    if (adminAppEl) adminAppEl.classList.add('hidden');
  }

  function showLocked() {
    if (loadingBoxEl) loadingBoxEl.classList.add('hidden');
    if (lockedBoxEl) lockedBoxEl.classList.remove('hidden');
    if (adminAppEl) adminAppEl.classList.add('hidden');
  }

  function showAdmin() {
    if (loadingBoxEl) loadingBoxEl.classList.add('hidden');
    if (lockedBoxEl) lockedBoxEl.classList.add('hidden');
    if (adminAppEl) adminAppEl.classList.remove('hidden');
  }

  function isAdminUser(user) {
    return Boolean(user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  }

  async function getSessionUser() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      setDebug('getSession error: ' + error.message);
      return null;
    }
    return data?.session?.user || null;
  }

  async function validateUser() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) {
      setDebug('getUser error: ' + error.message);
      return null;
    }
    return data?.user || null;
  }

  async function checkAdminAccess() {
    let user = await getSessionUser();
    if (!user) user = await validateUser();
    currentUser = user;

    if (!user || !isAdminUser(user)) {
      showLocked();
      return false;
    }

    showAdmin();
    return true;
  }

  function renderPendingTracks(tracks) {
    if (!trackListEl) return;
    trackListEl.innerHTML = '';

    if (!tracks.length) {
      trackListEl.innerHTML = '<div class="empty">No pending tracks right now.</div>';
      setStatus('No pending tunes waiting for approval.');
      if (queueBadgeEl) queueBadgeEl.textContent = 'Queue clear';
      setDebug('');
      return;
    }

    setStatus(`${tracks.length} pending tune(s) waiting for approval.`);
    if (queueBadgeEl) queueBadgeEl.textContent = `${tracks.length} pending`;
    setDebug('');

    tracks.forEach((track) => {
      const createdAt = track.created_at ? new Date(track.created_at).toLocaleString() : 'Unknown';
      const article = document.createElement('article');
      article.className = 'track-item';
      article.innerHTML = `
        <div class="track-head">
          <div>
            <h3 class="track-title">${escapeHtml(track.title || 'Untitled')}</h3>
            <p class="track-meta">Artist: ${escapeHtml(track.artist || 'Unknown')}</p>
            <p class="track-id">ID: ${escapeHtml(track.id)} · Submitted: ${escapeHtml(createdAt)}</p>
          </div>
          <div class="track-status">pending</div>
        </div>
        <audio controls preload="none" src="${escapeHtml(track.file_url || '')}"></audio>
        <button class="approve-btn" data-action="approve" data-id="${escapeHtml(track.id)}">Approve tune</button>
      `;
      trackListEl.appendChild(article);
    });

    document.querySelectorAll('[data-action="approve"]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (isApproving) return;
        await approveTrack(button.getAttribute('data-id'), button);
      });
    });
  }

  async function loadPendingTracks() {
    setDebug('Fetching pending tunes...');
    const { data, error } = await supabaseClient
      .from('tracks')
      .select('id, title, artist, file_url, created_at, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      setStatus('Could not load pending tracks: ' + error.message, true);
      if (queueBadgeEl) queueBadgeEl.textContent = 'Queue unavailable';
      return;
    }

    renderPendingTracks(data || []);
  }

  function buildMetricGroups(snapshot) {
    return {
      traffic: [
        { label: 'Unique visitors today', value: snapshot.uniqueVisitorsToday ?? 0, note: 'Today' },
        { label: 'Unique visitors (7 days)', value: snapshot.uniqueVisitors7d ?? 0, note: 'Last 7 days' },
        { label: 'Unique visitors (30 days)', value: snapshot.uniqueVisitors30d ?? 0, note: 'Last 30 days' },
        { label: 'Returning visitors (30 days)', value: snapshot.returningVisitors30d ?? 0, note: 'Returning users' },
        { label: 'Top page today', value: snapshot.topPageToday || '—', note: 'Most visited page' }
      ],
      content: [
        { label: 'Pending tracks', value: snapshot.pendingTracks ?? 0, note: 'Needs review' },
        { label: 'Approved tracks', value: snapshot.approvedTracks ?? 0, note: 'Live tunes' },
        { label: 'Live artist profiles', value: snapshot.liveProfiles ?? 0, note: 'Public profiles' },
        { label: 'Profiles on the platform', value: snapshot.profilesTotal ?? 0, note: 'Total profiles' }
      ],
      platform: [
        { label: 'Total platform likes', value: snapshot.totalPlatformLikes ?? 0, note: 'All-time likes' },
        { label: 'Profiles on the platform', value: snapshot.profilesTotal ?? 0, note: 'Community size' },
        { label: 'Approved tracks', value: snapshot.approvedTracks ?? 0, note: 'Available catalogue' },
        { label: 'Pending tracks', value: snapshot.pendingTracks ?? 0, note: 'Moderation queue' }
      ]
    };
  }

  function isNumericMetric(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function renderMetricSummary(rows) {
    if (!metricSummaryEl) return;
    metricSummaryEl.innerHTML = rows.slice(0, 3).map((row) => `
      <article class="summary-card">
        <div class="summary-card__label">${escapeHtml(row.label)}</div>
        <div class="summary-card__value">${escapeHtml(String(row.value))}</div>
        <div class="summary-card__note">${escapeHtml(row.note || '')}</div>
      </article>
    `).join('');
  }

  function renderMetricChart(rows) {
    if (!metricChartEl) return;
    const numericRows = rows.filter((row) => isNumericMetric(row.value));

    if (!numericRows.length) {
      metricChartEl.innerHTML = '<div class="empty">No graphable values in this category yet.</div>';
      return;
    }

    const maxValue = Math.max(...numericRows.map((row) => row.value), 1);
    metricChartEl.innerHTML = numericRows.map((row) => {
      const width = Math.max(4, Math.round((row.value / maxValue) * 100));
      return `
        <div class="chart-row">
          <div class="chart-label">${escapeHtml(row.label)}</div>
          <div class="chart-track" aria-hidden="true"><span class="chart-fill" style="--bar-width: ${width}%"></span></div>
          <div class="chart-value">${escapeHtml(String(row.value))}</div>
        </div>
      `;
    }).join('');
  }

  function renderMetricList(rows) {
    if (!metricListEl) return;
    metricListEl.innerHTML = rows.map((row) => `
      <li class="metric-row">
        <span class="metric-label">${escapeHtml(row.label)}</span>
        <span class="metric-value">${escapeHtml(String(row.value))}</span>
      </li>
    `).join('');
  }

  function renderMetrics(snapshot) {
    currentMetricSnapshot = snapshot || {};
    const groups = buildMetricGroups(currentMetricSnapshot);
    const rows = groups[currentMetricFilter] || groups.traffic;

    renderMetricSummary(rows);
    renderMetricChart(rows);
    renderMetricList(rows);
  }

  function setMetricFilter(filter) {
    currentMetricFilter = filter || 'traffic';
    metricTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.getAttribute('data-metric-filter') === currentMetricFilter);
    });
    if (currentMetricSnapshot) renderMetrics(currentMetricSnapshot);
  }

  async function loadMetrics() {
    if (!metricListEl) return;
    metricListEl.innerHTML = '<li class="empty">Loading metrics...</li>';
    if (metricSummaryEl) metricSummaryEl.innerHTML = '';
    if (metricChartEl) metricChartEl.innerHTML = '';

    const { data, error } = await supabaseClient.rpc('get_admin_traffic_snapshot');
    if (error) {
      setDebug('metrics error: ' + error.message);
      metricListEl.innerHTML = '<li class="empty">Could not load admin metrics right now.</li>';
      return;
    }

    const snapshot = Array.isArray(data) ? (data[0] || {}) : (data || {});
    renderMetrics(snapshot);
  }

  async function approveTrack(trackId, buttonEl) {
    if (!trackId) return;
    isApproving = true;
    const originalLabel = buttonEl.textContent;
    buttonEl.disabled = true;
    buttonEl.textContent = 'Approving...';

    const { error } = await supabaseClient
      .from('tracks')
      .update({ status: 'approved' })
      .eq('id', trackId);

    if (error) {
      setStatus('Approve failed: ' + error.message, true);
      buttonEl.disabled = false;
      buttonEl.textContent = originalLabel;
      isApproving = false;
      return;
    }

    setStatus('Tune approved.');
    await Promise.all([loadPendingTracks(), loadMetrics()]);
    isApproving = false;
  }

  async function boot() {
    showLoading('Checking admin access...');
    const ok = await checkAdminAccess();
    if (!ok) return;
    showLoading('Loading admin data...');
    showAdmin();
    await Promise.all([loadPendingTracks(), loadMetrics()]);
  }

  metricTabs.forEach((tab) => {
    tab.addEventListener('click', () => setMetricFilter(tab.getAttribute('data-metric-filter')));
  });

  document.addEventListener('DOMContentLoaded', async () => {
    if (hasInitialized) return;
    hasInitialized = true;
    await boot();
  });
})();
