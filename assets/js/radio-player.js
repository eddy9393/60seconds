
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
          <span id="ssfmMiniTune" class="ssfm-mini-player-tune">Loading radio…</span>
          <span id="ssfmMiniTuneCopy" class="ssfm-mini-player-tune-copy">Loading radio…</span>
        </div>
      </div>
    </div>
    <div class="ssfm-mini-player-actions">
      <input id="ssfmMiniVolume" class="ssfm-mini-volume" type="range" min="0" max="1" step="0.01" value="0.8" aria-label="Volume">
      <button id="ssfmMiniLike" class="ssfm-mini-btn" type="button" aria-label="Like current tune">♥</button>
    </div>
    <audio id="ssfmMiniAudio" playsinline crossorigin="anonymous"></audio>
  `;
  document.body.appendChild(root);
  
  const els = {
    root,
    audio: root.querySelector('#ssfmMiniAudio'),
    volume: root.querySelector('#ssfmMiniVolume'),
    like: root.querySelector('#ssfmMiniLike'),
    tune: root.querySelector('#ssfmMiniTune'),
    tuneCopy: root.querySelector('#ssfmMiniTuneCopy'),
    marquee: root.querySelector('#ssfmMiniMarquee')
  };

  let currentState = readState();
  let tunes = [];

  function setTuneText(title, artist) {
    const text = title && artist ? `${title} — ${artist}` : (title || artist || 'Radio offline');
    els.tune.textContent = text;
    els.tuneCopy.textContent = text;
  }

  function updateLikeButton() {
    const likes = readLikes();
    const liked = currentState.currentTuneId && likes.includes(String(currentState.currentTuneId));
    els.like.classList.toggle('like-active', Boolean(liked));
  }

  function syncFromStorage() {
    currentState = readState();
    const isActive = Boolean(currentState.isActivated && currentState.currentTuneUrl);
    root.classList.toggle('hidden', !isActive);
    document.body.classList.toggle('ssfm-has-mini-player', isActive);
    if (!isActive) return;

    setTuneText(currentState.currentTitle, currentState.currentArtist);
    els.volume.value = String(typeof currentState.volume === 'number' ? currentState.volume : 0.8);
    updateLikeButton();
  }

  function saveProgress() {
    if (!currentState.currentTuneId) return;
    const previewStart = Number(currentState.previewStart || 0);
    const previewElapsed = Math.max(0, (els.audio.currentTime || 0) - previewStart);
    writeState({
      previewElapsed,
      volume: Number(els.volume.value),
      muted: els.audio.muted
    });
  }

  async function loadTunes() {
    const { data, error } = await supabaseClient
      .from('tunes')
      .select('id, title, artist, file_url, user_id, preview_start_seconds, preview_duration_seconds')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('mini player tune load error:', error);
      tunes = [];
      return;
    }

    tunes = Array.isArray(data) ? data : [];
  }

  function chooseNextTune() {
    if (!tunes.length) return null;
    const currentId = currentState.currentTuneId ? String(currentState.currentTuneId) : null;
    const pool = tunes.filter((tune) => String(tune.id) !== currentId);
    const source = pool.length ? pool : tunes;
    return source[Math.floor(Math.random() * source.length)] || null;
  }

  function applyTuneState(tune) {
    if (!tune) return;
    currentState = writeState({
      isActivated: true,
      currentTuneId: tune.id,
      currentTuneUrl: tune.file_url,
      currentTitle: tune.title,
      currentArtist: tune.artist,
      currentUserId: tune.user_id || null,
      previewStart: Number(tune.preview_start_seconds || 0),
      previewDuration: Number(tune.preview_duration_seconds || 60),
      previewElapsed: 0,
      isPlaying: true
    });
    syncFromStorage();
  }

  function bindAudio() {
    els.audio.addEventListener('timeupdate', saveProgress);
    els.audio.addEventListener('ended', async () => {
      const nextTune = chooseNextTune();
      if (!nextTune) {
        writeState({ previewElapsed: 0, isPlaying: false });
        return;
      }
      applyTuneState(nextTune);
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

    if (els.audio.src !== currentState.currentTuneUrl) {
      els.audio.src = currentState.currentTuneUrl;
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
    if (!currentState.currentTuneId) return;
    const likes = new Set(readLikes().map(String));
    const key = String(currentState.currentTuneId);
    if (likes.has(key)) likes.delete(key); else likes.add(key);
    writeLikes([...likes]);
    updateLikeButton();
  });

  async function boot() {
    bindAudio();
    await loadTunes();
    syncFromStorage();
    if (root.classList.contains('hidden')) return;
    await ensurePlayback();
  }

  boot().catch(console.error);
})();
