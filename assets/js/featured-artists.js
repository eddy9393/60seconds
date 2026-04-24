(function () {
  var INTERVAL_MS = 10000;
  var artists = [];
  var currentIndex = 0;
  var timer = null;

  var sectionEl  = document.getElementById('featuredArtistSection');
  var prevBtn    = document.getElementById('featuredArtistPrev');
  var nextBtn    = document.getElementById('featuredArtistNext');
  var mainSlot   = document.getElementById('faMainCard');
  var sideSlot   = document.getElementById('faSideCards');
  var progressEl = document.getElementById('featuredArtistProgress');

  if (!sectionEl) return;

  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function flag(code) {
    if (!code || code.length !== 2) return '';
    return code.toUpperCase().replace(/./g, function(c) {
      return String.fromCodePoint(c.charCodeAt(0) + 127397);
    });
  }

  function roles(arr) {
    if (!Array.isArray(arr) || !arr.length) return '';
    return arr.filter(function(r) { return r && r !== 'none'; })
      .map(function(r) { return r.charAt(0).toUpperCase() + r.slice(1); })
      .join(' · ');
  }

  function formatNum(n) {
    if (!n) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0','') + 'K';
    return String(n);
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

  function photoHTML(artist, size) {
    if (artist.photo_url) {
      return '<img src="' + esc(artist.photo_url) + '" alt="' + esc(artist.artist_name) + '" class="fa-photo" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;display:block;">';
    }
    var initial = (artist.artist_name || 'A').charAt(0).toUpperCase();
    return '<div class="fa-initials" style="width:' + size + 'px;height:' + size + 'px;">' + esc(initial) + '</div>';
  }

  function renderMain(artist) {
    var roleStr  = roles(artist.music_roles);
    var flagStr  = flag(artist.nationality);
    var plays    = formatNum(artist.track_play_count);
    var likes    = formatNum(artist.track_likes_count);

    var metaPills = '';
    if (artist.nationality) {
      metaPills += '<span class="fa-pill">' + (flagStr ? flagStr + ' ' : '') + esc(artist.nationality.toUpperCase()) + '</span>';
    }
    if (artist.show_city_on_artist_page && artist.city) {
      metaPills += '<span class="fa-pill">&#128205; ' + esc(artist.city) + '</span>';
    }

    var statsHTML = '';
    if (artist.track_play_count || artist.track_likes_count) {
      statsHTML = '<div class="fa-stats">'
        + '<div class="fa-stat"><span class="fa-stat-val">' + plays + '</span><span class="fa-stat-label">Plays</span></div>'
        + '<div class="fa-stat-sep"></div>'
        + '<div class="fa-stat"><span class="fa-stat-val">' + likes + '</span><span class="fa-stat-label">Likes</span></div>'
        + '</div>';
    }

    mainSlot.innerHTML = '<div class="fa-main-inner">'
      + '<div class="fa-main-photo-wrap">' + photoHTML(artist, 110) + '<div class="fa-photo-ring"></div></div>'
      + '<div class="fa-main-info">'
        + '<div class="fa-name">' + esc(artist.artist_name || 'Unknown') + '</div>'
        + (roleStr ? '<div class="fa-role">' + esc(roleStr) + '</div>' : '')
        + (metaPills ? '<div class="fa-meta">' + metaPills + '</div>' : '')
        + (artist.track_title ? '<div class="fa-tune">&#9835; ' + esc(artist.track_title) + '</div>' : '')
        + (artist.bio ? '<div class="fa-bio">' + esc(artist.bio) + '</div>' : '')
        + statsHTML
        + '<a href="artist.html?id=' + encodeURIComponent(artist.user_id) + '" class="fa-view-btn">View profile &#8250;</a>'
      + '</div>'
    + '</div>';
  }

  function renderSide(artist, idx) {
    var roleStr = roles(artist.music_roles);
    var flagStr = flag(artist.nationality);
    var metaPills = '';
    if (artist.nationality) {
      metaPills += '<span class="fa-pill fa-pill-sm">' + (flagStr ? flagStr + ' ' : '') + esc(artist.nationality.toUpperCase()) + '</span>';
    }

    return '<div class="fa-side-card" data-idx="' + idx + '">'
      + '<div class="fa-side-photo-wrap">' + photoHTML(artist, 64) + '</div>'
      + '<div class="fa-side-name">' + esc(artist.artist_name || 'Unknown') + '</div>'
      + (roleStr ? '<div class="fa-side-role">' + esc(roleStr) + '</div>' : '')
      + (metaPills ? '<div class="fa-meta" style="justify-content:center;margin:4px 0;">' + metaPills + '</div>' : '')
      + (artist.track_title ? '<div class="fa-side-tune">&#9835; ' + esc(artist.track_title) + '</div>' : '')
      + '<a href="artist.html?id=' + encodeURIComponent(artist.user_id) + '" class="fa-view-btn fa-view-btn-sm">View profile &#8250;</a>'
    + '</div>';
  }

  function render(newIndex, direction) {
    currentIndex = ((newIndex % artists.length) + artists.length) % artists.length;

    renderMain(artists[currentIndex]);

    var sideHTML = '';
    for (var i = 1; i <= 2; i++) {
      var si = (currentIndex + i) % artists.length;
      sideHTML += renderSide(artists[si], (currentIndex + i));
    }
    sideSlot.innerHTML = sideHTML;

    sideSlot.querySelectorAll('.fa-side-card').forEach(function(card) {
      card.addEventListener('click', function() {
        var idx = parseInt(card.getAttribute('data-idx'));
        render(idx, 'next');
        restartProgress();
        clearInterval(timer);
        timer = setInterval(function() { render(currentIndex + 1, 'next'); }, INTERVAL_MS);
      });
    });

    restartProgress();
  }

  async function load() {
    var supabase = null;
    for (var i = 0; i < 20; i++) {
      supabase = window.SSFMApp && typeof window.SSFMApp.getSupabaseClient === 'function'
        ? window.SSFMApp.getSupabaseClient() : null;
      if (supabase) break;
      await new Promise(function(r) { setTimeout(r, 100); });
    }
    if (!supabase) return;

    try {
      var tracksRes = await supabase
        .from('tracks')
        .select('user_id, title, play_count')
        .eq('status', 'approved');

      if (tracksRes.error || !tracksRes.data || !tracksRes.data.length) {
        sectionEl.style.display = 'none'; return;
      }

      var trackMap = {};
      tracksRes.data.forEach(function(t) { trackMap[t.user_id] = t; });
      var uids = Object.keys(trackMap);

      var profRes = await supabase
        .from('profiles')
        .select('user_id, artist_name, photo_url, bio, nationality, city, show_city_on_artist_page, music_roles')
        .in('user_id', uids)
        .not('artist_name', 'is', null)
        .neq('artist_name', '')
        .limit(20);

      if (profRes.error || !profRes.data || !profRes.data.length) {
        sectionEl.style.display = 'none'; return;
      }

      // Haal likes op
      var likesRes = await supabase
        .from('track_likes')
        .select('artist_user_id');

      var likesMap = {};
      if (!likesRes.error && likesRes.data) {
        likesRes.data.forEach(function(l) {
          likesMap[l.artist_user_id] = (likesMap[l.artist_user_id] || 0) + 1;
        });
      }

      artists = profRes.data
        .map(function(p) {
          var t = trackMap[p.user_id] || {};
          return Object.assign({}, p, {
            track_title: t.title || null,
            track_play_count: t.play_count || 0,
            track_likes_count: likesMap[p.user_id] || 0
          });
        })
        .sort(function() { return Math.random() - 0.5; });

      if (artists.length < 2) { sectionEl.style.display = 'none'; return; }

      sectionEl.style.display = '';
      sectionEl.classList.remove('hidden');
      render(0);
      timer = setInterval(function() { render(currentIndex + 1, 'next'); }, INTERVAL_MS);

    } catch(e) {
      console.error('[featured-artists]', e);
      sectionEl.style.display = 'none';
    }
  }

  if (prevBtn) prevBtn.addEventListener('click', function() {
    render(currentIndex - 1, 'prev');
    clearInterval(timer);
    timer = setInterval(function() { render(currentIndex + 1, 'next'); }, INTERVAL_MS);
  });
  if (nextBtn) nextBtn.addEventListener('click', function() {
    render(currentIndex + 1, 'next');
    clearInterval(timer);
    timer = setInterval(function() { render(currentIndex + 1, 'next'); }, INTERVAL_MS);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else { load(); }
})();
