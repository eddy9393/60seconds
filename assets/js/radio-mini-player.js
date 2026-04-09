(function () {
  const pageName = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (pageName === 'index.html' || pageName === '') return;
  if (!window.supabase) return;

  const supabaseClient = window.supabase.createClient(
    "https://rgoutegbcpjytplqcwze.supabase.co",
    "sb_publishable_255qyDKS77nMU0pbedfa_A_3hdgtEHh"
  );

  const SESSION_KEY = 'ssfm_radio_session_v2';
  const VOLUME_KEY = 'ssfm_radio_volume_v2';
  const LIKE_KEY = 'ssfm_radio_like_v2';
  const DEFAULT_VOLUME = 0.3;
  const STORAGE_SYNC_MS = 1200;

  const MINI_PLAYER_ICONS = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true" class="mini-svg-icon"><path d="M12 20.5 4.7 13.9a4.8 4.8 0 0 1-.4-6.8A4.7 4.7 0 0 1 11 7.3l1 1 1-1a4.7 4.7 0 0 1 6.7-.2 4.8 4.8 0 0 1-.4 6.8L12 20.5Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true" class="mini-svg-icon"><path d="M8 6.5v11l9-5.5-9-5.5Z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true" class="mini-svg-icon"><rect x="7" y="6.5" width="3.5" height="11" rx="1.2" fill="currentColor"/><rect x="13.5" y="6.5" width="3.5" height="11" rx="1.2" fill="currentColor"/></svg>',
    volume: '<svg viewBox="0 0 24 24" aria-hidden="true" class="mini-svg-icon"><path d="M4 10h4l5-4v12l-5-4H4z" fill="currentColor"/><path d="M16 9.2a3.3 3.3 0 0 1 0 5.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M18.7 6.8a6.3 6.3 0 0 1 0 10.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'
  };

  const state = {
    tracks: [],
    currentIndex: -1,
    currentTrack: null,
    previewStart: 0,
    previewDuration: 60,
    shouldPlay: false,
    desiredPlayback: false,
    liked: false,
    audio: null,
    els: {},
    booting: false,
    lastPersistAt: 0,
    playRequestToken: 0,
    sessionKeyToday: '',
    unlockEventsBound: false,
    unexpectedPauseTimer: null,
    volumeOpen: false
  };

  function todayKey() {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  }

  function loadSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}'); } catch { return {}; }
  }

  function saveSession(patch = {}) {
    const next = Object.assign({}, loadSession(), patch, { lastUpdatedAt: Date.now(), lastPath: window.location.pathname });
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    return next;
  }

  function getDesiredPlayback(session = loadSession()) {
    if (!session.isStarted || session.startedDate !== state.sessionKeyToday) return false;
    if (typeof session.desiredPlaying === 'boolean') return session.desiredPlaying;
    return session.isPlaying !== false;
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
  }

  function getPreviewStart(track) {
    const value = Number(track && track.preview_start_seconds);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function getPreviewDuration(track) {
    const value = Number(track && track.preview_duration_seconds);
    return Number.isFinite(value) && value > 0 ? value : 60;
  }

  function getSafeVolume(candidate) {
    const value = Number(candidate);
    if (!Number.isFinite(value)) return DEFAULT_VOLUME;
    return Math.max(0, Math.min(1, value));
  }

  function updatePlayPauseLabel() {
    if (!state.els.pauseBtn) return;
    state.els.pauseBtn.innerHTML = state.audio && !state.audio.paused
      ? `<span class="mini-player-icon">${MINI_PLAYER_ICONS.pause}</span><span>Pause</span>`
      : `<span class="mini-player-icon">${MINI_PLAYER_ICONS.play}</span><span>Play</span>`;
  }

  function updateLikeLabel() {
    if (!state.els.likeBtn) return;
    state.els.likeBtn.innerHTML = state.liked
      ? `<span class="mini-player-icon">${MINI_PLAYER_ICONS.heart}</span><span>Liked</span>`
      : `<span class="mini-player-icon">${MINI_PLAYER_ICONS.heart}</span><span>Like</span>`;
    state.els.likeBtn.classList.toggle('is-liked', state.liked);
  }

  function updateMeta() {
    if (state.els.artist) state.els.artist.textContent = (state.currentTrack && state.currentTrack.artist) || '—';
    if (state.els.title) state.els.title.textContent = (state.currentTrack && state.currentTrack.title) || '—';
  }

  function syncVolumeUi() {
    if (!state.audio || !state.els.volume) return;
    state.els.volume.value = String(getSafeVolume(state.audio.volume));
  }

  function clearUnexpectedPauseTimer() {
    if (!state.unexpectedPauseTimer) return;
    clearTimeout(state.unexpectedPauseTimer);
    state.unexpectedPauseTimer = null;
  }

  function scheduleUnexpectedResume(delay = 180) {
    clearUnexpectedPauseTimer();
    if (!state.audio || !state.desiredPlayback || !state.audio.src) return;
    state.unexpectedPauseTimer = setTimeout(() => {
      if (!state.audio || !state.desiredPlayback || !state.audio.src || !state.audio.paused) return;
      state.audio.play().then(() => persistProgress(true)).catch(() => {});
    }, delay);
  }

  function setVolumeOpen(open) {
    state.volumeOpen = Boolean(open);
    if (!state.els.wrap) return;
    state.els.wrap.classList.toggle('volume-open', state.volumeOpen);
  }

  function applyBodySpacing() {
    document.body.classList.add('has-mini-radio-player');
  }

  function persistProgress(force = false) {
    if (!state.audio || !state.currentTrack) return;
    const now = Date.now();
    if (!force && now - state.lastPersistAt < STORAGE_SYNC_MS) return;
    state.lastPersistAt = now;
    const previewOffset = Math.max(0, (state.audio.currentTime || 0) - state.previewStart);
    saveSession({
      startedDate: state.sessionKeyToday,
      isStarted: true,
      isPlaying: !state.audio.paused,
      desiredPlaying: state.desiredPlayback,
      currentTrack: state.currentTrack,
      currentTrackId: state.currentTrack.id,
      currentIndex: state.currentIndex,
      previewOffset,
      volume: getSafeVolume(state.audio.volume),
      muted: state.audio.muted
    });
    localStorage.setItem(VOLUME_KEY, String(getSafeVolume(state.audio.volume)));
  }

  function chooseNextTrackIndex() {
    if (!state.tracks.length) return -1;
    let next = 0;
    do { next = Math.floor(Math.random() * state.tracks.length); } while (state.tracks.length > 1 && next === state.currentIndex);
    return next;
  }


  async function awardListeningSecond() {
    try {
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError || !sessionData?.session?.user) return false;

      const { data, error } = await supabaseClient.rpc('award_listening_second_v2', {});
      if (error || !data) {
        console.error('mini player awardListeningSecond error:', error);
        return false;
      }
      return Boolean(data.success);
    } catch (err) {
      console.error('mini player awardListeningSecond catch:', err);
      return false;
    }
  }

  async function advanceAfterTrackCompletion() {
    await awardListeningSecond();
    await nextTrack();
  }

  async function loadTracks() {
    const { data, error } = await supabaseClient
      .from('tracks')
      .select('id, title, artist, file_url, user_id, preview_start_seconds, preview_duration_seconds, status, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('mini player tracks error:', error);
      state.tracks = [];
      return;
    }
    state.tracks = data || [];
  }

  function attachAudio() {
    state.audio = document.createElement('audio');
    state.audio.preload = 'auto';
    state.audio.playsInline = true;
    state.audio.crossOrigin = 'anonymous';
    state.audio.style.display = 'none';
    document.body.appendChild(state.audio);

    state.audio.addEventListener('loadedmetadata', () => {
      const session = loadSession();
      const safeVolume = getSafeVolume(session.volume ?? localStorage.getItem(VOLUME_KEY) ?? DEFAULT_VOLUME);
      state.audio.volume = safeVolume;
      state.audio.muted = safeVolume === 0;
      syncVolumeUi();
    });

    state.audio.addEventListener('timeupdate', () => {
      const elapsed = Math.max(0, (state.audio.currentTime || 0) - state.previewStart);
      const clamped = Math.min(elapsed, state.previewDuration);
      if (state.els.time) state.els.time.textContent = `${formatTime(clamped)} / ${formatTime(state.previewDuration)}`;
      persistProgress();
      if (elapsed >= state.previewDuration) advanceAfterTrackCompletion().catch((err) => console.error(err));
    });

    state.audio.addEventListener('play', () => {
      clearUnexpectedPauseTimer();
      state.shouldPlay = true;
      updatePlayPauseLabel();
      persistProgress(true);
    });

    state.audio.addEventListener('pause', () => {
      state.shouldPlay = false;
      updatePlayPauseLabel();
      persistProgress(true);
      if (!document.hidden && state.desiredPlayback) {
        scheduleUnexpectedResume(220);
      }
    });

    state.audio.addEventListener('ended', () => { advanceAfterTrackCompletion().catch((err) => console.error(err)); });
  }

  async function playTrackAt(index, previewOffset = 0, autoplay = state.desiredPlayback) {
    const track = state.tracks[index];
    if (!track || !state.audio) return;
    const requestToken = ++state.playRequestToken;
    state.currentIndex = index;
    state.currentTrack = track;
    state.previewStart = getPreviewStart(track);
    state.previewDuration = getPreviewDuration(track);
    state.desiredPlayback = Boolean(autoplay);
    updateMeta();
    const safeOffset = Math.max(0, Math.min(previewOffset, Math.max(state.previewDuration - 0.25, 0)));
    const targetTime = state.previewStart + safeOffset;
    state.audio.src = track.file_url;
    state.audio.autoplay = Boolean(state.desiredPlayback);
    if (state.els.time) state.els.time.textContent = `${formatTime(safeOffset)} / ${formatTime(state.previewDuration)}`;
    await new Promise((resolve) => {
      const onReady = () => {
        state.audio.removeEventListener('loadedmetadata', onReady);
        if (requestToken !== state.playRequestToken) return resolve();
        const maxStart = Math.max(0, (state.audio.duration || targetTime) - 0.25);
        try { state.audio.currentTime = Math.min(targetTime, maxStart); } catch {}
        resolve();
      };
      state.audio.addEventListener('loadedmetadata', onReady);
      state.audio.load();
    });
    if (requestToken !== state.playRequestToken) return;

    saveSession({
      startedDate: state.sessionKeyToday,
      isStarted: true,
      desiredPlaying: state.desiredPlayback,
      currentTrack: track,
      currentTrackId: track.id,
      currentIndex: index,
      previewOffset: safeOffset,
      volume: getSafeVolume(state.audio.volume),
      muted: state.audio.muted
    });

    if (state.desiredPlayback) {
      state.shouldPlay = true;
      try {
        await state.audio.play();
      } catch (err) {
        console.log('mini player autoplay blocked:', err);
        scheduleUnexpectedResume(260);
        updatePlayPauseLabel();
        persistProgress(true);
      }
    } else {
      state.shouldPlay = false;
      state.audio.pause();
      updatePlayPauseLabel();
      persistProgress(true);
    }
  }

  async function nextTrack() {
    const nextIndex = chooseNextTrackIndex();
    if (nextIndex < 0) return;
    await playTrackAt(nextIndex, 0, state.desiredPlayback);
  }

  async function attemptResumeFromSession(forcePlay = false) {
    if (!state.audio) return;
    const session = loadSession();
    if (!session.isStarted || session.startedDate !== state.sessionKeyToday) return;
    if (!state.currentTrack) return;
    const desiredOffset = Number(session.previewOffset) || 0;
    const currentOffset = Math.max(0, (state.audio.currentTime || 0) - state.previewStart);
    if (Math.abs(currentOffset - desiredOffset) > 2 && !state.audio.seeking) {
      try {
        state.audio.currentTime = state.previewStart + desiredOffset;
      } catch {}
    }
    const safeVolume = getSafeVolume(session.volume ?? localStorage.getItem(VOLUME_KEY) ?? DEFAULT_VOLUME);
    state.audio.volume = safeVolume;
    state.audio.muted = safeVolume === 0;
    syncVolumeUi();
    state.desiredPlayback = forcePlay || getDesiredPlayback(session);
    state.shouldPlay = state.desiredPlayback;
    if (state.desiredPlayback && state.audio.paused) {
      try {
        await state.audio.play();
      } catch (err) {
        console.log('mini player resume blocked:', err);
        scheduleUnexpectedResume(260);
      }
    } else if (!state.desiredPlayback && !state.audio.paused) {
      state.audio.pause();
    }
    updatePlayPauseLabel();
    persistProgress(true);
  }

  function injectStyles() {
    if (document.getElementById('ssfmMiniPlayerStyles')) return;
    const style = document.createElement('style');
    style.id = 'ssfmMiniPlayerStyles';
    style.textContent = `.has-mini-radio-player{padding-bottom:calc(var(--mobile-bottom-nav-height, 86px) + 78px + env(safe-area-inset-bottom, 0px)) !important;}
.mini-radio-player{position:fixed;left:8px;right:8px;bottom:calc(var(--mobile-bottom-nav-height,86px) + env(safe-area-inset-bottom,0px) - 1px);z-index:115;border-radius:16px 16px 0 0;padding:8px 10px 6px;background:linear-gradient(180deg, rgba(20,20,20,0.97), rgba(10,10,10,0.99));border:1px solid rgba(255,255,255,0.08);border-bottom:0;box-shadow:0 -8px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04);backdrop-filter:blur(8px);color:#f5f5f5;font-family:'Manrope',sans-serif}
.mini-radio-player.hidden{display:none!important}
.mini-radio-top{display:flex;flex-direction:column;gap:1px;min-width:0;margin-bottom:6px}
.mini-radio-artist,.mini-radio-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mini-radio-artist{font-size:11px;color:#d9d9d9}
.mini-radio-title{font-size:13px;font-weight:700;font-family:'Space Grotesk',sans-serif;color:#fff}
.mini-radio-controls{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;min-width:0;overflow:hidden}
.mini-radio-btn{appearance:none;-webkit-appearance:none;min-height:32px;border-radius:999px;border:1px solid rgba(255,255,255,0.14)!important;background:linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)), linear-gradient(180deg, rgba(10,10,10,0.86), rgba(10,10,10,0.92))!important;color:#f5f5f5!important;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08),0 10px 22px rgba(0,0,0,0.18);white-space:nowrap;text-decoration:none!important;font-family:'Manrope',sans-serif;line-height:1;flex:0 0 auto}
.mini-radio-btn span{color:inherit!important}
.mini-radio-btn .mini-player-icon{width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;line-height:1;color:#d4af37!important;flex:0 0 auto}.mini-svg-icon{width:14px;height:14px;display:block}
.mini-radio-btn.is-liked{border-color:rgba(212,175,55,0.72)!important;background:linear-gradient(180deg,#f3d87a,#cfa12a)!important;color:#141414!important;box-shadow:inset 0 1px 0 rgba(255,255,255,0.35),0 10px 22px rgba(0,0,0,0.18),0 0 0 1px rgba(212,175,55,0.28)}
.mini-radio-btn.is-liked span{color:#141414!important}
.mini-radio-btn.is-liked .mini-player-icon{color:#141414!important}
.mini-radio-btn.like-feedback{transform:scale(1.08)}
.mini-radio-volume-wrap{display:inline-flex;align-items:center;gap:7px;min-width:78px;flex:0 0 92px;padding:0 8px;height:32px;border-radius:999px;border:1px solid rgba(255,255,255,0.14);background:linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)), linear-gradient(180deg, rgba(10,10,10,0.86), rgba(10,10,10,0.92));box-shadow:inset 0 1px 0 rgba(255,255,255,0.08),0 10px 22px rgba(0,0,0,0.18);margin-left:auto}
.mini-radio-volume-icon{width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;line-height:1;color:#d4af37;flex:0 0 auto}.mini-radio-volume-icon .mini-svg-icon{width:14px;height:14px}
.mini-radio-volume-wrap input[type=range]{width:100%;min-width:0;margin:0;accent-color:#d4af37;background:transparent}
.mini-radio-time{font-size:10px;color:#bfbfbf;white-space:nowrap;min-width:60px;text-align:right;flex:0 0 auto}
@media (max-width:420px){.mini-radio-btn{padding:0 8px;font-size:11px}.mini-radio-btn span:last-child{display:none}.mini-radio-btn#miniRadioLike span:last-child{display:inline}.mini-radio-volume-wrap{min-width:72px;flex-basis:84px;padding:0 7px}.mini-radio-time{min-width:48px;font-size:9px}}
@media (min-width:901px){.has-mini-radio-player{padding-bottom:0 !important}.mini-radio-player{left:auto;right:24px;bottom:24px;width:min(430px,calc(100vw - 120px));border-radius:22px;border-bottom:1px solid rgba(255,255,255,0.08);padding:14px 16px}.mini-radio-top{gap:4px;margin-bottom:10px}.mini-radio-title{font-size:15px}.mini-radio-artist{font-size:13px}.mini-radio-btn{min-height:40px;padding:0 14px;font-size:14px}.mini-radio-volume-wrap{height:40px;min-width:124px;flex-basis:140px}.mini-radio-time{font-size:12px;min-width:72px}}`;
    document.head.appendChild(style);
  }

  function injectMarkup() {
    injectStyles();
    const wrap = document.createElement('div');
    wrap.className = 'mini-radio-player hidden';
    wrap.innerHTML = `<div class="mini-radio-top"><div id="miniRadioArtist" class="mini-radio-artist">—</div><div id="miniRadioTitle" class="mini-radio-title">—</div></div><div class="mini-radio-controls"><button id="miniRadioLike" class="mini-radio-btn" type="button"><span class="mini-player-icon">${MINI_PLAYER_ICONS.heart}</span><span>Like</span></button><button id="miniRadioPause" class="mini-radio-btn" type="button"><span class="mini-player-icon">${MINI_PLAYER_ICONS.play}</span><span>Play</span></button><div class="mini-radio-volume-wrap"><span class="mini-radio-volume-icon" aria-hidden="true">${MINI_PLAYER_ICONS.volume}</span><input id="miniRadioVolume" type="range" min="0" max="1" step="0.01" value="0.3" aria-label="Volume"></div><div id="miniRadioTime" class="mini-radio-time">0:00 / 1:00</div></div>`;
    document.body.appendChild(wrap);
    state.els.wrap = wrap;
    state.els.artist = wrap.querySelector('#miniRadioArtist');
    state.els.title = wrap.querySelector('#miniRadioTitle');
    state.els.likeBtn = wrap.querySelector('#miniRadioLike');
    state.els.pauseBtn = wrap.querySelector('#miniRadioPause');
    state.els.volume = wrap.querySelector('#miniRadioVolume');
    state.els.time = wrap.querySelector('#miniRadioTime');
    applyBodySpacing();
    state.liked = localStorage.getItem(LIKE_KEY) === '1';
    updateLikeLabel();
    state.els.likeBtn.addEventListener('click', () => {
      state.liked = !state.liked;
      localStorage.setItem(LIKE_KEY, state.liked ? '1' : '0');
      updateLikeLabel();
      state.els.likeBtn.classList.add('like-feedback');
      setTimeout(() => { state.els.likeBtn && state.els.likeBtn.classList.remove('like-feedback'); }, 220);
    });
    state.els.pauseBtn.addEventListener('click', async () => {
      if (!state.audio) return;
      if (state.audio.paused) {
        state.desiredPlayback = true;
        state.shouldPlay = true;
        clearUnexpectedPauseTimer();
        try { await state.audio.play(); } catch (err) { console.log(err); scheduleUnexpectedResume(260); }
      } else {
        state.desiredPlayback = false;
        state.shouldPlay = false;
        clearUnexpectedPauseTimer();
        state.audio.pause();
      }
      persistProgress(true);
    });
    state.els.volume.addEventListener('input', (e) => {
      const value = getSafeVolume(e.target.value);
      if (!state.audio) return;
      state.audio.volume = value;
      state.audio.muted = value === 0;
      persistProgress(true);
    });
  }

  function pauseMiniRadio() {
    state.desiredPlayback = false;
    state.shouldPlay = false;
    clearUnexpectedPauseTimer();
    if (state.audio && !state.audio.paused) {
      state.audio.pause();
    }
    persistProgress(true);
    updatePlayPauseLabel();
  }

  window.__ssfmPauseMiniRadio = pauseMiniRadio;

  function scheduleResumeBurst() {
    [0, 180, 600, 1400].forEach((delay) => {
      setTimeout(() => { attemptResumeFromSession(false).catch(() => {}); }, delay);
    });
  }

  async function boot() {
    if (state.booting) return;
    state.booting = true;
    state.sessionKeyToday = todayKey();
    const session = loadSession();
    if (!session.isStarted || session.startedDate !== state.sessionKeyToday) return;

    injectMarkup();
    attachAudio();

    const initialVolume = getSafeVolume(localStorage.getItem(VOLUME_KEY) || session.volume || DEFAULT_VOLUME);
    state.audio.volume = initialVolume;
    state.audio.muted = initialVolume === 0;
    state.els.volume.value = String(initialVolume);
    state.desiredPlayback = getDesiredPlayback(session);
    state.shouldPlay = state.desiredPlayback;

    await loadTracks();
    if (!state.tracks.length && !(session.currentTrack && session.currentTrack.file_url)) return;

    let index = state.tracks.findIndex((track) => String(track.id) === String(session.currentTrackId || (session.currentTrack && session.currentTrack.id) || ''));
    if (index < 0 && session.currentTrack && session.currentTrack.file_url) {
      state.tracks.unshift(session.currentTrack);
      index = 0;
    }
    if (index < 0) index = 0;

    await playTrackAt(index, Number(session.previewOffset) || 0, state.desiredPlayback);
    state.els.wrap.classList.remove('hidden');
    updatePlayPauseLabel();
    updateLikeLabel();

    window.addEventListener('focus', () => { scheduleResumeBurst(); });
    window.addEventListener('pageshow', () => { scheduleResumeBurst(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        persistProgress(true);
        return;
      }
      scheduleResumeBurst();
    });

    if (!state.unlockEventsBound) {
      state.unlockEventsBound = true;
      const resumeIfNeeded = () => {
        if (!state.audio || !state.desiredPlayback || !state.audio.paused) return;
        state.audio.play().then(() => persistProgress(true)).catch(() => { scheduleUnexpectedResume(260); });
      };
      ['touchstart', 'pointerdown', 'click'].forEach((eventName) => {
        document.addEventListener(eventName, resumeIfNeeded, { passive: true });
      });
    }

    window.addEventListener('beforeunload', () => { clearUnexpectedPauseTimer(); persistProgress(true); });
    window.addEventListener('pagehide', () => { clearUnexpectedPauseTimer(); persistProgress(true); });
    window.addEventListener('storage', (event) => {
      if (event.key !== SESSION_KEY && event.key !== VOLUME_KEY) return;
      scheduleResumeBurst();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { boot().catch((err) => console.error(err)); });
  else boot().catch((err) => console.error(err));
})();
