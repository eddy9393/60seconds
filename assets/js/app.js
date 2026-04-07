(function () {
  const state = {
    auth: {
      status: 'loading', // loading | anonymous | authenticated
      user: null
    },
    artistProfile: null,
    nowPlaying: null,
    stats: {
      listeners: null,
      submittedTunes: null,
      playsPerDay: null,
      totalPlays: null
    }
  };

  const storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    remove(key) {
      localStorage.removeItem(key);
    }
  };

  function bootAuth() {
    const user = storage.get('ssfm_user', null);
    const artistProfile = storage.get('ssfm_artist_profile', null);

    if (user) {
      state.auth.status = 'authenticated';
      state.auth.user = user;
    } else {
      state.auth.status = 'anonymous';
      state.auth.user = null;
    }

    state.artistProfile = artistProfile;
  }

  function getInitials(name = '') {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || '')
      .join('') || 'A';
  }

  function formatNumber(value) {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('nl-NL').format(value);
  }

  function logout() {
    storage.remove('ssfm_user');
    storage.remove('ssfm_artist_profile');
    window.location.href = 'index.html';
  }

  function renderNavbar() {
    const root = document.querySelector('[data-navbar]');
    if (!root) return;

    const isAuthed = state.auth.status === 'authenticated';
    const initials = getInitials(state.auth.user?.name || state.artistProfile?.artistName || 'A');

    root.innerHTML = `
      <div class="container nav-shell">
        <a class="brand" href="index.html">
          <span class="brand-mark">🎧</span>
          <span>60 Seconds FM</span>
        </a>

        <nav class="nav-links">
          <a href="index.html">Radio</a>
          <a href="join.html">Profile</a>
          <a href="notifications.html">Notifications</a>
          <a href="submit-track.html">Tune</a>
        </nav>

        <div class="nav-actions">
          ${
            isAuthed
              ? `
                <a class="avatar" href="join.html" aria-label="Profile">${initials}</a>
                <button class="btn btn-ghost" id="logoutBtn" type="button">Logout</button>
              `
              : `
                <a class="btn btn-ghost" href="login.html">Login</a>
              `
          }
        </div>
      </div>
    `;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
  }

  function renderAuthBlocks() {
    document.querySelectorAll('[data-auth-required]').forEach(el => {
      el.hidden = state.auth.status !== 'authenticated';
    });

    document.querySelectorAll('[data-auth-anon]').forEach(el => {
      el.hidden = state.auth.status === 'authenticated';
    });

    document.querySelectorAll('[data-artist-required]').forEach(el => {
      el.hidden = !state.artistProfile;
    });

    document.querySelectorAll('[data-artist-missing]').forEach(el => {
      el.hidden = !!state.artistProfile;
    });
  }

  function seedDemoData() {
    if (!storage.get('ssfm_stats')) {
      storage.set('ssfm_stats', {
        listeners: 18,
        submittedTunes: 142,
        playsPerDay: 987,
        totalPlays: 12483
      });
    }

    if (!storage.get('ssfm_now_playing')) {
      storage.set('ssfm_now_playing', {
        title: 'Midnight Signal',
        artist: 'Nova Echo',
        artwork: '',
        progress: 14,
        duration: 60
      });
    }

    state.stats = storage.get('ssfm_stats', state.stats);
    state.nowPlaying = storage.get('ssfm_now_playing', null);
  }

  function renderStats() {
    document.querySelectorAll('[data-stat]').forEach(el => {
      const key = el.dataset.stat;
      el.textContent = formatNumber(state.stats[key]);
    });
  }

  function renderNowPlaying() {
    const title = document.querySelector('[data-now-playing-title]');
    const artist = document.querySelector('[data-now-playing-artist]');
    const progress = document.querySelector('[data-now-playing-progress]');
    const time = document.querySelector('[data-now-playing-time]');

    if (!state.nowPlaying) return;

    if (title) title.textContent = state.nowPlaying.title;
    if (artist) artist.textContent = state.nowPlaying.artist;
    if (progress) {
      const pct = Math.max(0, Math.min(100, (state.nowPlaying.progress / state.nowPlaying.duration) * 100));
      progress.style.width = `${pct}%`;
    }
    if (time) {
      time.textContent = `${state.nowPlaying.progress}:00 / 1:00`.replace('60:00', '1:00');
    }
  }

  function setUser(user) {
    storage.set('ssfm_user', user);
    boot();
  }

  function setArtistProfile(profile) {
    storage.set('ssfm_artist_profile', profile);
    boot();
  }

  function boot() {
    bootAuth();
    seedDemoData();
    renderNavbar();
    renderAuthBlocks();
    renderStats();
    renderNowPlaying();
  }

  window.SSFM = {
    state,
    storage,
    boot,
    setUser,
    setArtistProfile,
    logout
  };

  document.addEventListener('DOMContentLoaded', boot);
})();
