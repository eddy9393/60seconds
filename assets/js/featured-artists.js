// featured-artists.js
// Haalt goedgekeurde artiesten op en toont ze als carrousel (elke 10 seconden)

(function () {
  const INTERVAL_MS = 10000;
  const TRANSITION_MS = 600;

  let artists = [];
  let currentIndex = 0;
  let timer = null;
  let isPaused = false;

  const sectionEl   = document.getElementById('featuredArtistSection');
  const cardEl      = document.getElementById('featuredArtistCard');
  const photoEl     = document.getElementById('featuredArtistPhoto');
  const photoWrapEl = document.getElementById('featuredArtistPhotoWrap');
  const nameEl      = document.getElementById('featuredArtistName');
  const roleEl      = document.getElementById('featuredArtistRole');
  const bioEl       = document.getElementById('featuredArtistBio');
  const metaEl      = document.getElementById('featuredArtistMeta');
  const tuneTitleEl = document.getElementById('featuredArtistTuneTitle');
  const linkEl      = document.getElementById('featuredArtistLink');
  const dotsEl      = document.getElementById('featuredArtistDots');
  const prevBtn     = document.getElementById('featuredArtistPrev');
  const nextBtn     = document.getElementById('featuredArtistNext');
  const progressEl  = document.getElementById('featuredArtistProgress');

  if (!sectionEl) return;

  function escapeHtml(str) {
    if (window.SSFMApp && typeof window.SSFMApp.escapeHtml === 'function') {
      return window.SSFMApp.escapeHtml(str);
    }
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getFlagEmoji(code) {
    if (!code || code.length !== 2) return '';
    return code.toUpperCase().replace(/./g, c =>
      String.fromCodePoint(c.charCodeAt(0) + 127397)
    );
  }

  function formatRoles(roles) {
    if (!Array.isArray(roles) || !roles.length) return '';
    return roles
      .filter(r => r && r !== 'none')
      .map(r => r.charAt(0).toUpperCase() + r.slice(1))
      .join(' · ');
  }

  function buildDots(count, active) {
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('button');
      dot.className = 'fa-dot' + (i === active ? ' active' : '');
      dot.setAttribute('aria-label', `Artist ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(dot);
    }
  }

  function restartProgress() {
    if (!progressEl) return;
    progressEl.style.transition = 'none';
    progressEl.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        progressEl.style.transition = `width ${INTERVAL_MS}ms linear`;
        progressEl.style.width = '100%';
      });
    });
  }

  function showArtist(artist, direction = 'next') {
    if (!cardEl) return;

    cardEl.classList.add('fa-exiting');
    cardEl.style.transform = direction === 'next' ? 'translateX(-32px)' : 'translateX(32px)';
    cardEl.style.opacity = '0';

    setTimeout(() => {
      renderArtist(artist);
      cardEl.style.transform = direction === 'next' ? 'translateX(32px)' : 'translateX(-32px)';

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cardEl.style.transition = `transform ${TRANSITION_MS}ms cubic-bezier(0.22,1,0.36,1), opacity ${TRANSITION_MS}ms ease`;
          cardEl.style.transform = 'translateX(0)';
          cardEl.style.opacity = '1';
          cardEl.classList.remove('fa-exiting');
        });
      });
    }, TRANSITION_MS / 2);
  }

  function renderArtist(artist) {
    // Foto
    if (artist.photo_url) {
      photoEl.src = escapeHtml(artist.photo_url);
      photoEl.alt = escapeHtml(artist.artist_name || 'Artist');
      photoEl.classList.remove('hidden');
      photoWrapEl.classList.remove('fa-no-photo');
    } else {
      photoEl.classList.add('hidden');
      photoWrapEl.classList.add('fa-no-photo');
      photoWrapEl.setAttribute('data-initials',
        (artist.artist_name || 'A').charAt(0).toUpperCase()
      );
    }

    // Naam
    nameEl.textContent = artist.artist_name || 'Unknown Artist';

    // Rollen
    const roles = formatRoles(artist.music_roles);
    if (roles) {
      roleEl.textContent = roles;
      roleEl.classList.remove('hidden');
    } else {
      roleEl.classList.add('hidden');
    }

    // Bio
    if (artist.bio) {
      bioEl.textContent = artist.bio;
      bioEl.classList.remove('hidden');
    } else {
      bioEl.classList.add('hidden');
    }

    // Meta pills: nationaliteit + stad
    metaEl.innerHTML = '';
    if (artist.nationality) {
      const pill = document.createElement('span');
      pill.className = 'fa-pill';
      const flag = getFlagEmoji(artist.nationality);
      pill.textContent = flag ? flag + ' ' + artist.nationality.toUpperCase() : artist.nationality.toUpperCase();
      metaEl.appendChild(pill);
    }
    if (artist.city) {
      const pill = document.createElement('span');
      pill.className = 'fa-pill';
      pill.textContent = '📍 ' + escapeHtml(artist.city);
      metaEl.appendChild(pill);
    }

    // Tune titel
    if (artist.track_title) {
      tuneTitleEl.textContent = '🎵 ' + artist.track_title;
      tuneTitleEl.classList.remove('hidden');
    } else {
      tuneTitleEl.classList.add('hidden');
    }

    // Link naar artist pagina
    if (linkEl && artist.user_id) {
      linkEl.href = `artist.html?id=${encodeURIComponent(artist.user_id)}`;
    }
  }

  function goTo(index, direction) {
    const dir = direction || (index > currentIndex ? 'next' : 'prev');
    currentIndex = (index + artists.length) % artists.length;
    showArtist(artists[currentIndex], dir);
    buildDots(artists.length, currentIndex);
    restartProgress();
    resetTimer();
  }

  function next() {
    goTo(currentIndex + 1, 'next');
  }

  function prev() {
    goTo(currentIndex - 1, 'prev');
  }

  function resetTimer() {
    clearInterval(timer);
    if (!isPaused) {
      timer = setInterval(next, INTERVAL_MS);
    }
  }

  async function loadFeaturedArtists() {
    const supabase = window.SSFMApp?.getSupabaseClient?.();
    if (!supabase) return;

    // Haal artiesten op met een goedgekeurde track én een ingevuld profiel
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        user_id,
        artist_name,
        photo_url,
        bio,
        nationality,
        city,
        music_roles,
        tracks!inner ( title, status )
      `)
      .eq('tracks.status', 'approved')
      .not('artist_name', 'is', null)
      .neq('artist_name', '')
      .limit(20);

    if (error || !data || data.length === 0) {
      sectionEl.classList.add('hidden');
      return;
    }

    // Shuffle voor afwisseling
    artists = data
      .map(p => ({
        ...p,
        track_title: p.tracks?.[0]?.title || null,
      }))
      .sort(() => Math.random() - 0.5);

    sectionEl.classList.remove('hidden');
    buildDots(artists.length, 0);
    renderArtist(artists[0]);
    restartProgress();
    timer = setInterval(next, INTERVAL_MS);
  }

  // Navigatie knoppen
  if (prevBtn) prevBtn.addEventListener('click', prev);
  if (nextBtn) nextBtn.addEventListener('click', next);

  // Pauzeer bij hover
  if (cardEl) {
    cardEl.addEventListener('mouseenter', () => {
      isPaused = true;
      clearInterval(timer);
      if (progressEl) progressEl.style.transition = 'none';
    });
    cardEl.addEventListener('mouseleave', () => {
      isPaused = false;
      restartProgress();
      timer = setInterval(next, INTERVAL_MS);
    });
  }

  // Swipe support op mobiel
  let touchStartX = 0;
  if (cardEl) {
    cardEl.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    cardEl.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
    }, { passive: true });
  }

  // Laden na DOMContentLoaded of direct als DOM al klaar is
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFeaturedArtists);
  } else {
    loadFeaturedArtists();
  }

})();
