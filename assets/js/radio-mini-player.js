
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

  const state = { tracks: [], currentIndex: -1, currentTrack: null, previewStart: 0, previewDuration: 60, shouldPlay: false, liked: false, audio: null, els: {}, booting: false };

  function todayKey() {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  }

  function loadSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}'); } catch { return {}; }
  }
  function saveSession(patch = {}) {
    const next = Object.assign({}, loadSession(), patch);
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    return next;
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
  function updatePlayPauseLabel() {
    if (!state.els.pauseBtn) return;
    state.els.pauseBtn.innerHTML = state.audio && !state.audio.paused
      ? '<span class="mini-player-icon">⏸</span><span>Pause</span>'
      : '<span class="mini-player-icon">▶</span><span>Play</span>';
  }
  function updateLikeLabel() {
    if (!state.els.likeBtn) return;
    state.els.likeBtn.innerHTML = state.liked
      ? '<span class="mini-player-icon">♥</span><span>Liked</span>'
      : '<span class="mini-player-icon">♥</span><span>Like</span>';
    state.els.likeBtn.classList.toggle('is-liked', state.liked);
  }
  function updateMeta() {
    if (state.els.artist) state.els.artist.textContent = (state.currentTrack && state.currentTrack.artist) || '—';
    if (state.els.title) state.els.title.textContent = (state.currentTrack && state.currentTrack.title) || '—';
  }
  function persistProgress() {
    if (!state.audio || !state.currentTrack) return;
    const previewOffset = Math.max(0, (state.audio.currentTime || 0) - state.previewStart);
    saveSession({
      startedDate: todayKey(),
      isStarted: true,
      isPlaying: !state.audio.paused,
      currentTrack: state.currentTrack,
      currentTrackId: state.currentTrack.id,
      currentIndex: state.currentIndex,
      previewOffset,
      volume: state.audio.volume,
      muted: state.audio.muted
    });
    localStorage.setItem(VOLUME_KEY, String(state.audio.volume));
  }
  function chooseNextTrackIndex() {
    if (!state.tracks.length) return -1;
    let next = 0;
    do { next = Math.floor(Math.random() * state.tracks.length); } while (state.tracks.length > 1 && next === state.currentIndex);
    return next;
  }
  async function loadTracks() {
    const { data, error } = await supabaseClient.from('tracks').select('id, title, artist, file_url, user_id, preview_start_seconds, preview_duration_seconds, status, created_at').eq('status', 'approved').order('created_at', { ascending: false });
    if (error) { console.error('mini player tracks error:', error); state.tracks = []; return; }
    state.tracks = data || [];
  }
  function attachAudio() {
    state.audio = document.createElement('audio');
    state.audio.preload = 'auto';
    state.audio.playsInline = true;
    state.audio.crossOrigin = 'anonymous';
    state.audio.style.display = 'none';
    document.body.appendChild(state.audio);
    state.audio.addEventListener('timeupdate', () => {
      const elapsed = Math.max(0, (state.audio.currentTime || 0) - state.previewStart);
      if (state.els.time) state.els.time.textContent = `${formatTime(elapsed)} / ${formatTime(state.previewDuration)}`;
      persistProgress();
      if (elapsed >= state.previewDuration) nextTrack().catch((err) => console.error(err));
    });
    state.audio.addEventListener('play', () => { updatePlayPauseLabel(); persistProgress(); });
    state.audio.addEventListener('pause', () => { updatePlayPauseLabel(); persistProgress(); });
    state.audio.addEventListener('ended', () => { nextTrack().catch((err) => console.error(err)); });
  }
  async function playTrackAt(index, previewOffset = 0, autoplay = true) {
    const track = state.tracks[index];
    if (!track) return;
    state.currentIndex = index;
    state.currentTrack = track;
    state.previewStart = getPreviewStart(track);
    state.previewDuration = getPreviewDuration(track);
    updateMeta();
    const safeOffset = Math.max(0, Math.min(previewOffset, Math.max(state.previewDuration - 0.25, 0)));
    const targetTime = state.previewStart + safeOffset;
    state.audio.src = track.file_url;
    if (state.els.time) state.els.time.textContent = `${formatTime(safeOffset)} / ${formatTime(state.previewDuration)}`;
    await new Promise((resolve) => {
      const onReady = () => {
        state.audio.removeEventListener('loadedmetadata', onReady);
        const maxStart = Math.max(0, (state.audio.duration || targetTime) - 0.25);
        try { state.audio.currentTime = Math.min(targetTime, maxStart); } catch {}
        resolve();
      };
      state.audio.addEventListener('loadedmetadata', onReady);
      state.audio.load();
    });
    saveSession({ startedDate: todayKey(), isStarted: true, currentTrack: track, currentTrackId: track.id, currentIndex: index, previewOffset: safeOffset, volume: state.audio.volume, muted: state.audio.muted });
    if (autoplay) {
      try { await state.audio.play(); } catch (err) { console.log('mini player autoplay blocked:', err); }
    } else {
      state.audio.pause();
      updatePlayPauseLabel();
    }
  }
  async function nextTrack() {
    const nextIndex = chooseNextTrackIndex();
    if (nextIndex < 0) return;
    await playTrackAt(nextIndex, 0, true);
  }
  function injectStyles() {
    if (document.getElementById('ssfmMiniPlayerStyles')) return;
    const style = document.createElement('style');
    style.id = 'ssfmMiniPlayerStyles';
    style.textContent = `.mini-radio-player{position:fixed;left:18px;right:18px;bottom:98px;z-index:115;border-radius:22px;padding:14px 16px;background:linear-gradient(180deg, rgba(20,20,20,0.96), rgba(10,10,10,0.98));border:1px solid rgba(255,255,255,0.08);box-shadow:0 18px 40px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.04);backdrop-filter:blur(8px);color:#f5f5f5;font-family:'Manrope',sans-serif}.mini-radio-player.hidden{display:none!important}.mini-radio-top{display:flex;flex-direction:column;gap:4px;min-width:0;margin-bottom:10px}.mini-radio-artist,.mini-radio-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mini-radio-artist{font-size:13px;color:#d9d9d9}.mini-radio-title{font-size:15px;font-weight:700;font-family:'Space Grotesk',sans-serif;color:#fff}.mini-radio-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.mini-radio-btn{min-height:40px;border-radius:999px;border:1px solid rgba(255,255,255,0.14);background:linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)), linear-gradient(180deg, rgba(10,10,10,0.86), rgba(10,10,10,0.92));color:#f5f5f5;padding:0 14px;display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08),0 10px 22px rgba(0,0,0,0.24)}.mini-radio-btn .mini-player-icon{font-size:14px;line-height:1;color:#d4af37}.mini-radio-btn.is-liked .mini-player-icon{color:#fff}.mini-radio-volume{display:flex;align-items:center;gap:8px;min-width:120px;flex:1 1 140px}.mini-radio-volume input[type=range]{width:100%;accent-color:#d4af37}.mini-radio-time{font-size:12px;color:#bfbfbf;white-space:nowrap;margin-left:auto}@media (min-width:901px){.mini-radio-player{left:auto;right:24px;bottom:24px;width:min(420px,calc(100vw - 120px))}}`;
    document.head.appendChild(style);
  }
  function injectMarkup() {
    injectStyles();
    const wrap = document.createElement('div');
    wrap.className = 'mini-radio-player hidden';
    wrap.innerHTML = '<div class="mini-radio-top"><div id="miniRadioArtist" class="mini-radio-artist">—</div><div id="miniRadioTitle" class="mini-radio-title">—</div></div><div class="mini-radio-controls"><button id="miniRadioLike" class="mini-radio-btn" type="button"><span class="mini-player-icon">♥</span><span>Like</span></button><button id="miniRadioPause" class="mini-radio-btn" type="button"><span class="mini-player-icon">▶</span><span>Play</span></button><div class="mini-radio-volume"><span class="mini-player-icon">🔊</span><input id="miniRadioVolume" type="range" min="0" max="1" step="0.01" value="0.85"></div><div id="miniRadioTime" class="mini-radio-time">0:00 / 1:00</div></div>';
    document.body.appendChild(wrap);
    state.els.wrap = wrap;
    state.els.artist = wrap.querySelector('#miniRadioArtist');
    state.els.title = wrap.querySelector('#miniRadioTitle');
    state.els.likeBtn = wrap.querySelector('#miniRadioLike');
    state.els.pauseBtn = wrap.querySelector('#miniRadioPause');
    state.els.volume = wrap.querySelector('#miniRadioVolume');
    state.els.time = wrap.querySelector('#miniRadioTime');
    state.liked = localStorage.getItem(LIKE_KEY) === '1';
    updateLikeLabel();
    state.els.likeBtn.addEventListener('click', () => { state.liked = !state.liked; localStorage.setItem(LIKE_KEY, state.liked ? '1' : '0'); updateLikeLabel(); });
    state.els.pauseBtn.addEventListener('click', async () => { if (!state.audio) return; if (state.audio.paused) { state.shouldPlay = true; try { await state.audio.play(); } catch (err) { console.log(err); } } else { state.shouldPlay = false; state.audio.pause(); } persistProgress(); });
    state.els.volume.addEventListener('input', (e) => { const value = Number(e.target.value); if (!state.audio) return; state.audio.volume = value; state.audio.muted = value === 0; persistProgress(); });
  }
  async function boot() {
    if (state.booting) return;
    state.booting = true;
    const session = loadSession();
    if (!session.isStarted || session.startedDate !== todayKey()) return;
    injectMarkup();
    attachAudio();
    const initialVolume = Number(localStorage.getItem(VOLUME_KEY) || session.volume || 0.85);
    state.audio.volume = Number.isFinite(initialVolume) ? initialVolume : 0.85;
    state.audio.muted = state.audio.volume === 0;
    state.els.volume.value = String(state.audio.volume);
    state.shouldPlay = session.isPlaying !== false;
    await loadTracks();
    if (!state.tracks.length && !(session.currentTrack && session.currentTrack.file_url)) return;
    let index = state.tracks.findIndex((track) => String(track.id) === String(session.currentTrackId || (session.currentTrack && session.currentTrack.id) || ''));
    if (index < 0 && session.currentTrack && session.currentTrack.file_url) { state.tracks.unshift(session.currentTrack); index = 0; }
    if (index < 0) index = 0;
    await playTrackAt(index, Number(session.previewOffset) || 0, state.shouldPlay);
    state.els.wrap.classList.remove('hidden');
    updatePlayPauseLabel();
    updateLikeLabel();
    window.addEventListener('focus', () => { if (state.shouldPlay && state.audio && state.audio.paused) state.audio.play().catch(() => {}); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && state.shouldPlay && state.audio && state.audio.paused) state.audio.play().catch(() => {}); });
    window.addEventListener('beforeunload', persistProgress);
    window.addEventListener('pagehide', persistProgress);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { boot().catch((err) => console.error(err)); });
  else boot().catch((err) => console.error(err));
})();
