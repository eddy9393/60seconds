// featured-artists.js
// Haalt goedgekeurde artiesten op en toont ze als carrousel (elke 10 seconden)

(function () {
  const INTERVAL_MS  = 10000;
  const TRANSITION_MS = 500;

  let artists      = [];
  let currentIndex = 0;
  let timer        = null;
  let isPaused     = false;

  const sectionEl    = document.getElementById('featuredArtistSection');
  const cardEl       = document.getElementById('featuredArtistCard');
  const photoEl      = document.getElementById('featuredArtistPhoto');
  const photoWrapEl  = document.getElementById('featuredArtistPhotoWrap');
  const nameEl       = document.getElementById('featuredArtistName');
  const roleEl       = document.getElementById('featuredArtistRole');
  const bioEl        = document.getElementById('featuredArtistBio');
  const metaEl       = document.getElementById('featuredArtistMeta');
  const tuneTitleEl  = document.getElementById('featuredArtistTuneTitle');
  const linkEl       = document.getElementById('featuredArtistLink');
  const dotsEl       = document.getElementById('featuredArtistDots');
  const prevBtn      = document.getElementById('featuredArtistPrev');
  const nextBtn      = document.getElementById('featuredArtistNext');
  const progressEl   = document.getElementById('featuredArtistProgress');

  if (!sectionEl) return;

  function esc(str) {
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
    return roles.filter(r => r && r !== 'none')
      .map(r => r.charAt(0).toUpperCase() + r.slice(1))
      .join(' · ');
  }

  function buildDots(count, active) {
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    const max = Math.min(count, 10);
    for (let i = 0; i < max; i++) {
      const dot = document.createElement('button');
      dot.className = 'fa-dot' + (i === active ? ' active' : '');
      dot.setAttribute('aria-label', 'Artist ' + (i + 1));
      dot.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(dot);
    }
  }

  function restartProgress() {
    if (!progressEl) return;
    progressEl.style.transition = 'none';
    progressEl.style.width = '0%';
    requestAnimationFrame(function() { requestAnimationFrame(function() {
      progressEl.style.transition = 'width ' + INTERVAL_MS + 'ms linear';
      progressEl.style.width = '100%';
    }); });
  }

  function renderArtist(artist) {
    if (artist.photo_url) {
      photoEl.src = esc(artist.photo_url);
      photoEl.alt = esc(artist.artist_name || 'Artist');
      photoEl.style.display = 'block';
      photoWrapEl.classList.remove('fa-no-photo');
      photoWrapEl.removeAttribute('data-initials');
      if (cardEl) {
        cardEl.style.setProperty('--fa-bg-image', 'url("' + String(artist.photo_url).replace(/"/g, '%22') + '")');
        cardEl.classList.add('has-fa-bg');
      }
    } else {
      photoEl.style.display = 'none';
      photoWrapEl.classList.add('fa-no-photo');
      photoWrapEl.setAttribute('data-initials',
        (artist.artist_name || 'A').charAt(0).toUpperCase()
      );
      if (cardEl) {
        cardEl.style.removeProperty('--fa-bg-image');
        cardEl.classList.remove('has-fa-bg');
      }
    }

    nameEl.textContent = artist.artist_name || 'Unknown Artist';

    var roles = formatRoles(artist.music_roles);
    roleEl.textContent = roles;
    roleEl.style.display = roles ? '' : 'none';

    bioEl.textContent = artist.bio || '';
    bioEl.style.display = artist.bio ? '' : 'none';

    metaEl.innerHTML = '';
    if (artist.nationality) {
      var pill = document.createElement('span');
      pill.className = 'fa-pill';
      var flag = getFlagEmoji(artist.nationality);
      pill.textContent = (flag ? flag + ' ' : '') + artist.nationality.toUpperCase();
      metaEl.appendChild(pill);
    }
    if (artist.show_city_on_artist_page && artist.city) {
      var cpill = document.createElement('span');
      cpill.className = 'fa-pill';
      cpill.textContent = String.fromCodePoint(0x1F4CD) + ' ' + esc(artist.city);
      metaEl.appendChild(cpill);
    }

    tuneTitleEl.textContent = artist.track_title ? String.fromCodePoint(0x1F3B5) + ' ' + artist.track_title : '';
    tuneTitleEl.style.display = artist.track_title ? '' : 'none';

    if (linkEl) {
      linkEl.href = 'artist.html?id=' + encodeURIComponent(artist.user_id);
    }
  }

  function showArtist(artist, direction) {
    var outX = direction === 'next' ? '-28px' : '28px';
    var inX  = direction === 'next' ?  '28px' : '-28px';

    cardEl.style.transition = 'transform ' + (TRANSITION_MS/2) + 'ms ease, opacity ' + (TRANSITION_MS/2) + 'ms ease';
    cardEl.style.transform  = 'translateX(' + outX + ')';
    cardEl.style.opacity    = '0';

    setTimeout(function() {
      renderArtist(artist);
      cardEl.style.transition = 'none';
      cardEl.style.transform  = 'translateX(' + inX + ')';
      cardEl.style.opacity    = '0';
      requestAnimationFrame(function() { requestAnimationFrame(function() {
        cardEl.style.transition = 'transform ' + TRANSITION_MS + 'ms cubic-bezier(0.22,1,0.36,1), opacity ' + TRANSITION_MS + 'ms ease';
        cardEl.style.transform  = 'translateX(0)';
        cardEl.style.opacity    = '1';
      }); });
    }, TRANSITION_MS / 2);
  }

  function goTo(index, direction) {
    var dir = direction || (index > currentIndex ? 'next' : 'prev');
    currentIndex = ((index % artists.length) + artists.length) % artists.length;
    showArtist(artists[currentIndex], dir);
    buildDots(artists.length, currentIndex);
    restartProgress();
    clearInterval(timer);
    if (!isPaused) {
      timer = setInterval(function() { goTo(currentIndex + 1, 'next'); }, INTERVAL_MS);
    }
  }

  async function loadFeaturedArtists() {
    // Wacht tot SSFMApp beschikbaar is (max 2 seconden)
    var supabase = null;
    for (var i = 0; i < 20; i++) {
      supabase = window.SSFMApp && typeof window.SSFMApp.getSupabaseClient === 'function'
        ? window.SSFMApp.getSupabaseClient()
        : null;
      if (supabase) break;
      await new Promise(function(r) { setTimeout(r, 100); });
    }
    if (!supabase) {
      console.warn('[featured-artists] Supabase client niet gevonden');
      return;
    }

    try {
      // Stap 1: goedgekeurde tracks ophalen
      var tracksResult = await supabase
        .from('tracks')
        .select('user_id, title')
        .eq('status', 'approved');

      if (tracksResult.error || !tracksResult.data || tracksResult.data.length === 0) {
        sectionEl.style.display = 'none';
        return;
      }

      // user_id → titel map
      var trackMap = {};
      tracksResult.data.forEach(function(t) { trackMap[t.user_id] = t.title; });
      var approvedUserIds = Object.keys(trackMap);

      // Stap 2: profielen ophalen
      var profilesResult = await supabase
        .from('profiles')
        .select('user_id, artist_name, photo_url, bio, nationality, city, show_city_on_artist_page, music_roles')
        .in('user_id', approvedUserIds)
        .not('artist_name', 'is', null)
        .neq('artist_name', '')
        .limit(20);

      if (profilesResult.error || !profilesResult.data || profilesResult.data.length === 0) {
        sectionEl.style.display = 'none';
        return;
      }

      // Combineer
      artists = profilesResult.data
        .map(function(p) { return Object.assign({}, p, { track_title: trackMap[p.user_id] || null }); })
        .sort(function() { return Math.random() - 0.5; });

      // Toon sectie
      sectionEl.style.display = '';
      sectionEl.classList.remove('hidden');

      renderArtist(artists[0]);
      buildDots(artists.length, 0);
      restartProgress();
      timer = setInterval(function() { goTo(currentIndex + 1, 'next'); }, INTERVAL_MS);

    } catch (err) {
      console.error('[featured-artists] Fout:', err);
      sectionEl.style.display = 'none';
    }
  }

  if (prevBtn) prevBtn.addEventListener('click', function() { goTo(currentIndex - 1, 'prev'); });
  if (nextBtn) nextBtn.addEventListener('click', function() { goTo(currentIndex + 1, 'next'); });

  if (cardEl) {
    cardEl.addEventListener('mouseenter', function() {
      isPaused = true;
      clearInterval(timer);
      if (progressEl) {
        var w = getComputedStyle(progressEl).width;
        progressEl.style.transition = 'none';
        progressEl.style.width = w;
      }
    });
    cardEl.addEventListener('mouseleave', function() {
      isPaused = false;
      restartProgress();
      timer = setInterval(function() { goTo(currentIndex + 1, 'next'); }, INTERVAL_MS);
    });
  }

  var touchStartX = 0;
  if (cardEl) {
    cardEl.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    cardEl.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) goTo(currentIndex + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFeaturedArtists);
  } else {
    loadFeaturedArtists();
  }

})();
