
(function () {
  if (window.location.pathname.endsWith('/index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
    return;
  }
  if (!window.supabase) return;

  const supabaseClient = window.supabase.createClient(
    "https://rgoutegbcpjytplqcwze.supabase.co",
    "sb_publishable_255qyDKS77nMU0pbedfa_A_3hdgtEHh"
  );

  const STORAGE_KEY = 'ssfm_radio_state_v2';
  const LIKES_KEY = 'ssfm_radio_likes_v1';

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function writeState(patch) {
    const next = { ...readState(), ...patch, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function readLikes() {
    try {
      return JSON.parse(localStorage.getItem(LIKES_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function writeLikes(list) {
    localStorage.setItem(LIKES_KEY, JSON.stringify(list));
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const mins = Math.floor(safe / 60);
    const secs = String(safe % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  const root = document.createElement('div');
  root.id = 'ssfmMiniPlayer';
  root.className = 'ssfm-mini-player hidden';
  root.innerHTML = `
    <div class="ssfm-mini-player-top">
      <div class="ssfm-mini-player-label">Radio</div>
      <div class="ssfm-mini-player-marquee">
        <div id="ssfmMiniMarquee" class="ssfm-mini-player-marquee-inner">
          <span id="ssfmMiniTrack" class="ssfm-mini-player-track">Loading radio…</span>
          <span id="ssfmMiniTrackCopy" class="ssfm-mini-player-track-copy">Loading radio…</span>
        </div>
      </div>
    </div>
    <div class="ssfm-mini-player-actions">
      <input id="ssfmMiniVolume" class="ssfm-mini-volume" type="range" min="0" max="1" step="0.01" value="0.8" aria-label="Volume">
      <button id="ssfmMiniLike" class="ssfm-mini-btn" type="button" aria-label="Like current track">♥</button>
    </div>
    <audio id="ssfmMiniAudio" playsinline crossorigin="anonymous"></audio>
  `;
  document.body.appendChild(root);
  
  const els = {
    root,
    audio: root.querySelector('#ssfmMiniAudio'),
    volume: root.querySelector('#ssfmMiniVolume'),
    like: root.querySelector('#ssfmMiniLike'),
    track: root.querySelector('#ssfmMiniTrack'),
    trackCopy: root.querySelector('#ssfmMiniTrackCopy'),
    marquee: root.querySelector('#ssfmMiniMarquee')
  };

  let currentState = readState();
  let tracks = [];

  function setTrackText(title, artist) {
    const text = title && artist ? `${title} — ${artist}` : (title || artist || 'Radio offline');
    els.track.textContent = text;
    els.trackCopy.textContent = text;
  }

  function updateLikeButton() {
    const likes = readLikes();
    const liked = currentState.currentTrackId && likes.includes(String(currentState.currentTrackId));
    els.like.classList.toggle('like-active', Boolean(liked));
  }

  function syncFromStorage() {
    currentState = readState();
    const isActive = Boolean(currentState.isActivated && currentState.currentTrackUrl);
    root.classList.toggle('hidden', !isActive);
    document.body.classList.toggle('ssfm-has-mini-player', isActive);
    if (!isActive) return;

    setTrackText(currentState.currentTitle, currentState.currentArtist);
    els.volume.value = String(typeof currentState.volume === 'number' ? currentState.volume : 0.8);
    updateLikeButton();
  }

  function saveProgress() {
    if (!currentState.currentTrackId) return;
    const previewStart = Number(currentState.previewStart || 0);
    const previewElapsed = Math.max(0, (els.audio.currentTime || 0) - previewStart);
    writeState({
      previewElapsed,
      volume: Number(els.volume.value),
      muted: els.audio.muted
    });
  }

  async function loadTracks() {
    const { data, error } = await supabaseClient
      .from('tracks')
      .select('id, title, artist, file_url, user_id, preview_start_seconds, preview_duration_seconds')
      .eq('status', 'approved')
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

    if (error) {
      console.error('mini player track load error:', error);
      tracks = [];
      return;
    }

    tracks = Array.isArray(data) ? data : [];
  }

  function chooseNextTrack() {
    if (!tracks.length) return null;
    const currentId = currentState.currentTrackId ? String(currentState.currentTrackId) : null;
    const pool = tracks.filter((track) => String(track.id) !== currentId);
    const source = pool.length ? pool : tracks;
    return source[Math.floor(Math.random() * source.length)] || null;
  }

  function applyTrackState(track) {
    if (!track) return;
    currentState = writeState({
      isActivated: true,
      currentTrackId: track.id,
      currentTrackUrl: track.file_url,
      currentTitle: track.title,
      currentArtist: track.artist,
      currentUserId: track.user_id || null,
      previewStart: Number(track.preview_start_seconds || 0),
      previewDuration: Number(track.preview_duration_seconds || 60),
      previewElapsed: 0,
      isPlaying: true
    });
    syncFromStorage();
  }

  function bindAudio() {
    els.audio.addEventListener('timeupdate', saveProgress);
    els.audio.addEventListener('ended', async () => {
      const nextTrack = chooseNextTrack();
      if (!nextTrack) {
        writeState({ previewElapsed: 0, isPlaying: false });
        return;
      }
      applyTrackState(nextTrack);
      await ensurePlayback();
    });
    window.addEventListener('beforeunload', saveProgress);
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY || event.key === LIKES_KEY) {
        syncFromStorage();
      }
    });
  }

  async function ensurePlayback() {
    syncFromStorage();
    if (root.classList.contains('hidden')) return;

    if (els.audio.src !== currentState.currentTrackUrl) {
      els.audio.src = currentState.currentTrackUrl;
    }

    const previewStart = Number(currentState.previewStart || 0);
    const previewElapsed = Number(currentState.previewElapsed || 0);
    const previewDuration = Math.max(1, Number(currentState.previewDuration || 60));
    const safeOffset = Math.max(0, Math.min(previewElapsed, Math.max(previewDuration - 0.25, 0)));
    const targetTime = previewStart + safeOffset;

    els.audio.volume = Number(els.volume.value);
    els.audio.muted = els.audio.volume === 0;

    const setAndPlay = () => {
      try { els.audio.currentTime = targetTime; } catch {}
      els.audio.play().catch(() => {});
    };

    if (els.audio.readyState >= 1) {
      setAndPlay();
    } else {
      els.audio.onloadedmetadata = () => setAndPlay();
      els.audio.load();
    }
  }

  els.volume.addEventListener('input', () => {
    const value = Number(els.volume.value);
    els.audio.volume = value;
    els.audio.muted = value === 0;
    writeState({ volume: value, muted: els.audio.muted });
  });

  els.like.addEventListener('click', () => {
    if (!currentState.currentTrackId) return;
    const likes = new Set(readLikes().map(String));
    const key = String(currentState.currentTrackId);
    if (likes.has(key)) likes.delete(key); else likes.add(key);
    writeLikes([...likes]);
    updateLikeButton();
  });

  async function boot() {
    bindAudio();
    await loadTracks();
    syncFromStorage();
    if (root.classList.contains('hidden')) return;
    await ensurePlayback();
  }

  boot().catch(console.error);
})();
