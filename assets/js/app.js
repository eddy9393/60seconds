(function () {
  const config = window.APP_CONFIG || {};
  const supabaseConfig = config.supabase || {};
  const PROFILE_RUNTIME_STATE_KEY = config.profileRuntimeStateKey || 'ssfm_profile_runtime_state';
  let cachedSupabaseClient = null;

  const COUNTRY_TO_ISO = {"Aruba":"AW","Afghanistan":"AF","Angola":"AO","Anguilla":"AI","Åland Islands":"AX","Albania":"AL","Andorra":"AD","United Arab Emirates":"AE","Argentina":"AR","Armenia":"AM","American Samoa":"AS","Antarctica":"AQ","French Southern Territories":"TF","Antigua and Barbuda":"AG","Australia":"AU","Austria":"AT","Azerbaijan":"AZ","Burundi":"BI","Belgium":"BE","Benin":"BJ","Bonaire, Sint Eustatius and Saba":"BQ","Burkina Faso":"BF","Bangladesh":"BD","Bulgaria":"BG","Bahrain":"BH","Bahamas":"BS","Bosnia and Herzegovina":"BA","Saint Barthélemy":"BL","Belarus":"BY","Belize":"BZ","Bermuda":"BM","Bolivia, Plurinational State of":"BO","Brazil":"BR","Barbados":"BB","Brunei Darussalam":"BN","Bhutan":"BT","Bouvet Island":"BV","Botswana":"BW","Central African Republic":"CF","Canada":"CA","Cocos (Keeling) Islands":"CC","Switzerland":"CH","Chile":"CL","China":"CN","Côte d'Ivoire":"CI","Cameroon":"CM","Congo, The Democratic Republic of the":"CD","Congo":"CG","Cook Islands":"CK","Colombia":"CO","Comoros":"KM","Cabo Verde":"CV","Costa Rica":"CR","Cuba":"CU","Curaçao":"CW","Christmas Island":"CX","Cayman Islands":"KY","Cyprus":"CY","Czechia":"CZ","Germany":"DE","Djibouti":"DJ","Dominica":"DM","Denmark":"DK","Dominican Republic":"DO","Algeria":"DZ","Ecuador":"EC","Egypt":"EG","Eritrea":"ER","Western Sahara":"EH","Spain":"ES","Estonia":"EE","Ethiopia":"ET","Finland":"FI","Fiji":"FJ","Falkland Islands (Malvinas)":"FK","France":"FR","Faroe Islands":"FO","Micronesia, Federated States of":"FM","Gabon":"GA","United Kingdom":"GB","Georgia":"GE","Guernsey":"GG","Ghana":"GH","Gibraltar":"GI","Guinea":"GN","Guadeloupe":"GP","Gambia":"GM","Guinea-Bissau":"GW","Equatorial Guinea":"GQ","Greece":"GR","Grenada":"GD","Greenland":"GL","Guatemala":"GT","French Guiana":"GF","Guam":"GU","Guyana":"GY","Hong Kong":"HK","Heard Island and McDonald Islands":"HM","Honduras":"HN","Croatia":"HR","Haiti":"HT","Hungary":"HU","Indonesia":"ID","Isle of Man":"IM","India":"IN","British Indian Ocean Territory":"IO","Ireland":"IE","Iran, Islamic Republic of":"IR","Iraq":"IQ","Iceland":"IS","Israel":"IL","Italy":"IT","Jamaica":"JM","Jersey":"JE","Jordan":"JO","Japan":"JP","Kazakhstan":"KZ","Kenya":"KE","Kyrgyzstan":"KG","Cambodia":"KH","Kiribati":"KI","Saint Kitts and Nevis":"KN","Korea, Republic of":"KR","Kuwait":"KW","Lao People's Democratic Republic":"LA","Lebanon":"LB","Liberia":"LR","Libya":"LY","Saint Lucia":"LC","Liechtenstein":"LI","Sri Lanka":"LK","Lesotho":"LS","Lithuania":"LT","Luxembourg":"LU","Latvia":"LV","Macao":"MO","Saint Martin (French part)":"MF","Morocco":"MA","Monaco":"MC","Moldova, Republic of":"MD","Madagascar":"MG","Maldives":"MV","Mexico":"MX","Marshall Islands":"MH","North Macedonia":"MK","Mali":"ML","Malta":"MT","Myanmar":"MM","Montenegro":"ME","Mongolia":"MN","Northern Mariana Islands":"MP","Mozambique":"MZ","Mauritania":"MR","Montserrat":"MS","Martinique":"MQ","Mauritius":"MU","Malawi":"MW","Malaysia":"MY","Mayotte":"YT","Namibia":"NA","New Caledonia":"NC","Niger":"NE","Norfolk Island":"NF","Nigeria":"NG","Nicaragua":"NI","Niue":"NU","Netherlands":"NL","Norway":"NO","Nepal":"NP","Nauru":"NR","New Zealand":"NZ","Oman":"OM","Pakistan":"PK","Panama":"PA","Pitcairn":"PN","Peru":"PE","Philippines":"PH","Palau":"PW","Papua New Guinea":"PG","Poland":"PL","Puerto Rico":"PR","Korea, Democratic People's Republic of":"KP","Portugal":"PT","Paraguay":"PY","Palestine, State of":"PS","French Polynesia":"PF","Qatar":"QA","Réunion":"RE","Romania":"RO","Russian Federation":"RU","Rwanda":"RW","Saudi Arabia":"SA","Sudan":"SD","Senegal":"SN","Singapore":"SG","South Georgia and the South Sandwich Islands":"GS","Saint Helena, Ascension and Tristan da Cunha":"SH","Svalbard and Jan Mayen":"SJ","Solomon Islands":"SB","Sierra Leone":"SL","El Salvador":"SV","San Marino":"SM","Somalia":"SO","Saint Pierre and Miquelon":"PM","Serbia":"RS","South Sudan":"SS","Sao Tome and Principe":"ST","Suriname":"SR","Slovakia":"SK","Slovenia":"SI","Sweden":"SE","Eswatini":"SZ","Sint Maarten (Dutch part)":"SX","Seychelles":"SC","Syrian Arab Republic":"SY","Turks and Caicos Islands":"TC","Chad":"TD","Togo":"TG","Thailand":"TH","Tajikistan":"TJ","Tokelau":"TK","Turkmenistan":"TM","Timor-Leste":"TL","Tonga":"TO","Trinidad and Tobago":"TT","Tunisia":"TN","Türkiye":"TR","Tuvalu":"TV","Taiwan, Province of China":"TW","Tanzania, United Republic of":"TZ","Uganda":"UG","Ukraine":"UA","United States Minor Outlying Islands":"UM","Uruguay":"UY","United States":"US","Uzbekistan":"UZ","Holy See (Vatican City State)":"VA","Saint Vincent and the Grenadines":"VC","Venezuela, Bolivarian Republic of":"VE","Virgin Islands, British":"VG","Virgin Islands, U.S.":"VI","Viet Nam":"VN","Vanuatu":"VU","Wallis and Futuna":"WF","Samoa":"WS","Yemen":"YE","South Africa":"ZA","Zambia":"ZM","Zimbabwe":"ZW","Czech Republic":"CZ","Russia":"RU","South Korea":"KR","North Korea":"KP","Taiwan":"TW","Vietnam":"VN","Syria":"SY","Laos":"LA","Palestine":"PS","Bolivia":"BO","Venezuela":"VE","Moldova":"MD","Tanzania":"TZ","Brunei":"BN","Democratic Republic of the Congo":"CD","Micronesia":"FM","Turkey":"TR","Vatican City":"VA"};

  function getSupabaseClient() {
    if (cachedSupabaseClient) return cachedSupabaseClient;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Supabase client library is not available.');
    }
    if (!supabaseConfig.url || !supabaseConfig.anonKey) {
      throw new Error('Supabase configuration is missing.');
    }
    cachedSupabaseClient = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return cachedSupabaseClient;
  }

  function setHidden(element, hidden) {
    if (!element) return;
    element.classList.toggle('hidden', Boolean(hidden));
  }

  function setText(element, value) {
    if (!element) return;
    element.textContent = value ?? '';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function normalizeCoins(value) {
    return String(Math.max(0, Math.floor(Number(value) || 0)));
  }

  function setCurrencyText(valueEl, value, badgeEl) {
    if (badgeEl) badgeEl.classList.remove('hidden');
    if (valueEl) valueEl.textContent = normalizeCoins(value);
  }

  function applyRuntimeCurrencySnapshotToElement(valueEl, badgeEl) {
    try {
      const raw = localStorage.getItem(PROFILE_RUNTIME_STATE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (typeof data.coins !== 'undefined') setCurrencyText(valueEl, data.coins, badgeEl);
      return data;
    } catch {
      return null;
    }
  }

  function bindRuntimeCurrencySync(valueEl, badgeEl) {
    const sync = () => applyRuntimeCurrencySnapshotToElement(valueEl, badgeEl);
    window.addEventListener('storage', (event) => {
      if (event.key === PROFILE_RUNTIME_STATE_KEY) sync();
    });
    window.addEventListener('ssfm:coins-updated', sync);
    return sync;
  }

  function getProfileHref(profile) {
    if (!profile) return 'join.html';
    if (!hasCompletedArtistProfile(profile)) return 'edit-profile.html?welcome=1';
    if (profile?.user_id) return `artist.html?user_id=${encodeURIComponent(profile.user_id)}`;
    return 'join.html';
  }

  function getFlagEmoji(countryName) {
    const iso = COUNTRY_TO_ISO[String(countryName || '').trim()];
    if (!iso) return '';
    return iso.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
  }

  function getFlagMarkup(countryName, className = 'artist-flag') {
    const flag = getFlagEmoji(countryName);
    if (!flag) return '';
    return `<span class="${className}" aria-hidden="true">${flag}</span>`;
  }

  function hasCompletedArtistProfile(profile) {
    return Boolean(profile && String(profile.artist_name || '').trim());
  }


  async function clearInvalidSessionSafe() {
    try {
      await getSupabaseClient().auth.signOut({ scope: 'local' });
    } catch (localErr) {
      try {
        await getSupabaseClient().auth.signOut();
      } catch (signOutErr) {
        console.warn('clearInvalidSessionSafe signOut failed:', signOutErr || localErr);
      }
    }

    try {
      setUnreadNotificationsFlag(false);
    } catch (flagErr) {
      console.warn('clearInvalidSessionSafe flag reset failed:', flagErr);
    }
  }

  async function getCurrentUserSafe() {
    const supabaseClient = getSupabaseClient();
    const sessionResponse = await supabaseClient.auth.getSession();
    if (sessionResponse.error) throw sessionResponse.error;

    const sessionUser = sessionResponse.data?.session?.user || null;
    if (!sessionUser) return null;

    const userResponse = await supabaseClient.auth.getUser();
    if (userResponse.error) {
      await clearInvalidSessionSafe();
      return null;
    }

    const verifiedUser = userResponse.data?.user || null;
    if (!verifiedUser) {
      await clearInvalidSessionSafe();
      return null;
    }

    return verifiedUser;
  }




  const UNREAD_NOTIFICATIONS_KEY = 'ssfm_has_unread_notifications_v1';

  function setNavIcon(linkEl, iconPath) {
    if (!linkEl) return;
    const mask = linkEl.querySelector('.nav-icon-mask');
    if (!mask) return;
    mask.style.setProperty('--icon-url', `url('${iconPath}')`);
  }

  function hasUnreadNotifications() {
    return localStorage.getItem(UNREAD_NOTIFICATIONS_KEY) === '1';
  }

  function setUnreadNotificationsFlag(hasUnread) {
    localStorage.setItem(UNREAD_NOTIFICATIONS_KEY, hasUnread ? '1' : '0');
    try {
      updateNotificationIcons(buildStandardShellEls(document));
    } catch (err) {
      console.warn('updateNotificationIcons after setUnreadNotificationsFlag failed:', err);
    }
  }

  async function syncUnreadNotificationsFlagForUser(userId) {
    if (!userId) {
      setUnreadNotificationsFlag(false);
      return false;
    }

    try {
      const supabaseClient = getSupabaseClient();
      const { count, error } = await supabaseClient
        .from('user_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      const hasUnread = Number(count || 0) > 0;
      setUnreadNotificationsFlag(hasUnread);
      return hasUnread;
    } catch (err) {
      console.error('syncUnreadNotificationsFlagForUser error:', err);
      return false;
    }
  }

  function updateNotificationIcons(els) {
    const iconPath = hasUnreadNotifications() ? '/icons/notifications.png' : '/icons/nonotifications.png';
    setNavIcon(els?.desktopNav?.notificationsLink, iconPath);
    setNavIcon(els?.mobileNav?.notificationsLink, iconPath);
  }

  function buildStandardShellEls(doc = document) {
    return {
      header: {
        showLoginBtn: doc.getElementById('showLoginBtn'),
        headerAvatarBtn: doc.getElementById('headerAvatarBtn'),
        headerAvatarImage: doc.getElementById('headerAvatarImage'),
        headerAvatarFallback: doc.getElementById('headerAvatarFallback'),
        accountMenu: doc.getElementById('accountMenu'),
        accountProfileLink: doc.getElementById('accountProfileLink'),
        accountNotificationsLink: doc.getElementById('accountNotificationsLink'),
        logoutBtn: doc.getElementById('logout'),
        currencyBadge: doc.getElementById('currencyBadge'),
        currencyValue: doc.getElementById('currencyValue')
      },
      desktopNav: {
        loginLink: doc.getElementById('desktopLoginLink'),
        logoutBtn: doc.getElementById('desktopLogoutBtn'),
        profileLink: doc.getElementById('desktopProfileLink'),
        notificationsLink: doc.getElementById('desktopNotificationsLink'),
        likedLink: doc.getElementById('desktopLikedLink'),
        statsLink: doc.getElementById('desktopStatsLink'),
        trackLink: doc.getElementById('desktopTrackLink')
      },
      mobileNav: {
        loginLink: doc.getElementById('mobileLoginLink'),
        profileLink: doc.getElementById('mobileProfileLink'),
        notificationsLink: doc.getElementById('mobileNotificationsLink'),
        likedLink: doc.getElementById('mobileLikedLink'),
        statsLink: doc.getElementById('mobileStatsLink'),
        trackLink: doc.getElementById('mobileTrackLink')
      }
    };
  }

  function closeStandardHeaderPanels(els, extraCloser) {
    setHidden(els?.header?.accountMenu, true);
    if (typeof extraCloser === 'function') extraCloser();
  }

  function setStandardHeaderAvatar(els, photoUrl, artistName) {
    const imageEl = els?.header?.headerAvatarImage;
    const fallbackEl = els?.header?.headerAvatarFallback;
    if (!imageEl || !fallbackEl) return;
    if (photoUrl) {
      imageEl.src = photoUrl;
      setHidden(imageEl, false);
      setHidden(fallbackEl, true);
      return;
    }
    setHidden(imageEl, true);
    setHidden(fallbackEl, false);
    setText(fallbackEl, String(artistName || 'A').charAt(0).toUpperCase() || 'A');
  }

  function isMobileHeaderMenuMode() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function ensureMiniPlayerScript() {
    const pageName = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (pageName === 'index.html' || pageName === '') return;
    if (window.__SSFM_MINI_PLAYER_BOOTED) return;
    const existing = Array.from(document.scripts || []).find((script) => {
      const src = String(script.getAttribute('src') || '');
      return src.endsWith('assets/js/radio-mini-player.js') || src.endsWith('/assets/js/radio-mini-player.js');
    });
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'assets/js/radio-mini-player.js';
    script.defer = true;
    document.body.appendChild(script);
  }

  function handleStandardHeaderAvatarAction(els, profileHref, options = {}) {
    const menuEl = els?.header?.accountMenu;
    if (isMobileHeaderMenuMode() && menuEl) {
      menuEl.classList.toggle('hidden');
      return;
    }
    if (menuEl) menuEl.classList.add('hidden');
    if (typeof options.navigate === 'function') {
      options.navigate(profileHref || 'artist.html');
      return;
    }
    window.location.href = profileHref || 'artist.html';
  }

  function applyStandardMenuState(els, user, profile, track, options = {}) {
    const isLoggedIn = Boolean(user);
    const hasProfile = hasCompletedArtistProfile(profile);
    const hasTrack = Boolean(track);
    const profileHref = options.profileHref || getProfileHref(profile);
    const trackHref = options.trackHref || 'submit-track.html';

    setHidden(els?.desktopNav?.loginLink, isLoggedIn);
    setHidden(els?.mobileNav?.loginLink, isLoggedIn);
    setHidden(els?.desktopNav?.logoutBtn, !isLoggedIn);

    setHidden(els?.desktopNav?.profileLink, !isLoggedIn);
    setHidden(els?.mobileNav?.profileLink, !isLoggedIn);

    setHidden(els?.desktopNav?.notificationsLink, !isLoggedIn);
    setHidden(els?.mobileNav?.notificationsLink, !isLoggedIn);

    setHidden(els?.desktopNav?.likedLink, !isLoggedIn);
    setHidden(els?.mobileNav?.likedLink, !isLoggedIn);

    setHidden(els?.desktopNav?.statsLink, !isLoggedIn || !hasProfile);
    setHidden(els?.mobileNav?.statsLink, true);

    setHidden(els?.desktopNav?.trackLink, !isLoggedIn || !hasProfile);
    setHidden(els?.mobileNav?.trackLink, true);

    if (els?.desktopNav?.profileLink) els.desktopNav.profileLink.href = profileHref;
    if (els?.mobileNav?.profileLink) els.mobileNav.profileLink.href = profileHref;
    if (els?.header?.accountProfileLink) els.header.accountProfileLink.href = profileHref;
    setHidden(els?.header?.accountProfileLink, !isLoggedIn);

    if (els?.desktopNav?.likedLink) els.desktopNav.likedLink.href = options.likedHref || 'liked.html';
    if (els?.mobileNav?.likedLink) els.mobileNav.likedLink.href = options.likedHref || 'liked.html';
    if (els?.desktopNav?.statsLink) els.desktopNav.statsLink.href = options.statsHref || 'statistics.html';

    if (els?.desktopNav?.trackLink) {
      els.desktopNav.trackLink.href = trackHref;
      els.desktopNav.trackLink.setAttribute('data-track-mode', hasTrack ? 'edit' : 'submit');
    }
    if (els?.mobileNav?.trackLink) {
      els.mobileNav.trackLink.href = trackHref;
      els.mobileNav.trackLink.setAttribute('data-track-mode', hasTrack ? 'edit' : 'submit');
    }

    if (els?.header?.accountNotificationsLink && options.notificationsHref) {
      els.header.accountNotificationsLink.href = options.notificationsHref;
      setHidden(els.header.accountNotificationsLink, !isLoggedIn || options.hideAccountNotifications === true);
    }

    updateNotificationIcons(els);

    if (isLoggedIn && user?.id) {
      syncUnreadNotificationsFlagForUser(user.id).catch((err) => {
        console.error('applyStandardMenuState unread sync error:', err);
      });
    }
  }

  function setStandardLoggedOutState(els, options = {}) {
    setUnreadNotificationsFlag(false);
    closeStandardHeaderPanels(els, options.closeExtraPanels);
    applyStandardMenuState(els, null, null, null, options);
    setHidden(els?.header?.showLoginBtn, false);
    setHidden(els?.header?.headerAvatarBtn, true);
    setHidden(els?.header?.headerAvatarImage, true);
    setHidden(els?.header?.headerAvatarFallback, true);
    if (els?.header?.headerAvatarImage) els.header.headerAvatarImage.src = '';
    if (els?.header?.accountProfileLink) els.header.accountProfileLink.href = 'javascript:void(0)';
    setHidden(els?.header?.currencyBadge, true);
    setCurrencyText(els?.header?.currencyValue, 0);
  }

  function setStandardLoggedInState(els, options = {}) {
    setHidden(els?.header?.showLoginBtn, true);
    setHidden(els?.header?.headerAvatarBtn, false);
    setHidden(els?.header?.accountMenu, true);
    setHidden(els?.header?.currencyBadge, false);
    if (typeof options.coins !== 'undefined') setCurrencyText(els?.header?.currencyValue, options.coins, els?.header?.currencyBadge);
  }

  async function fetchProfileByUserId(userId, selectSql = '*') {
    if (!userId) return null;
    const supabaseClient = getSupabaseClient();
    const { data, error } = await supabaseClient.from('profiles').select(selectSql).eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function fetchTrackByUserId(userId, selectSql = '*') {
    if (!userId) return null;
    const supabaseClient = getSupabaseClient();
    const { data, error } = await supabaseClient.from('tracks').select(selectSql).eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data || null;
  }


  async function getArtistDisplayNameByUserId(userId, fallbackValue = 'Someone') {
    if (!userId) return fallbackValue;
    try {
      const profile = await fetchProfileByUserId(userId, 'artist_name');
      const artistName = String(profile?.artist_name || '').trim();
      if (artistName) return artistName;
    } catch (err) {
      console.warn('getArtistDisplayNameByUserId profile lookup failed:', err);
    }

    try {
      const currentUser = await getCurrentUserSafe();
      if (currentUser?.id && String(currentUser.id) === String(userId)) {
        const email = String(currentUser.email || '').trim();
        if (email) return email.split('@')[0] || fallbackValue;
      }
    } catch (err) {
      console.warn('getArtistDisplayNameByUserId auth lookup failed:', err);
    }

    return fallbackValue;
  }

  async function fetchLikedTrackIdsForUser(userId) {
    if (!userId) return [];
    const supabaseClient = getSupabaseClient();
    const { data, error } = await supabaseClient
      .from('track_likes')
      .select('track_id')
      .eq('liker_user_id', userId);

    if (error) throw error;
    return Array.isArray(data) ? data.map((row) => String(row.track_id)).filter(Boolean) : [];
  }

  async function syncLikedTrackIdsForUser(userId, storageKey = (config.radioLikeKey || 'ssfm_radio_likes_v2')) {
    if (!userId) {
      try { localStorage.removeItem(storageKey); } catch {}
      return [];
    }

    const likedIds = await fetchLikedTrackIdsForUser(userId);
    try {
      localStorage.setItem(storageKey, JSON.stringify(likedIds));
    } catch (err) {
      console.warn('syncLikedTrackIdsForUser localStorage sync failed:', err);
    }
    return likedIds;
  }

  async function toggleTrackLikeInSupabase({ trackId, artistUserId, likerUserId, likerDisplayName } = {}) {
    const safeTrackId = String(trackId || '').trim();
    const safeArtistUserId = String(artistUserId || '').trim();
    const safeLikerUserId = String(likerUserId || '').trim();

    if (!safeTrackId || !safeLikerUserId) {
      return { liked: false, changed: false, error: new Error('Missing track or user for like toggle.') };
    }

    if (safeArtistUserId && safeArtistUserId === safeLikerUserId) {
      return { liked: false, changed: false, ownTrack: true, error: new Error('You cannot like your own tune.') };
    }

    const supabaseClient = getSupabaseClient();
    const existingResponse = await supabaseClient
      .from('track_likes')
      .select('id')
      .eq('track_id', safeTrackId)
      .eq('liker_user_id', safeLikerUserId)
      .maybeSingle();

    if (existingResponse.error && existingResponse.error.code !== 'PGRST116') {
      return { liked: false, changed: false, error: existingResponse.error };
    }

    const existingLikeId = existingResponse.data?.id || null;

    if (existingLikeId) {
      const deleteResponse = await supabaseClient
        .from('track_likes')
        .delete()
        .eq('id', existingLikeId);

      if (deleteResponse.error) {
        return { liked: true, changed: false, error: deleteResponse.error };
      }

      return { liked: false, changed: true, likeId: null, error: null };
    }

    const insertResponse = await supabaseClient
      .from('track_likes')
      .insert({
        track_id: safeTrackId,
        liker_user_id: safeLikerUserId,
        artist_user_id: safeArtistUserId || null
      })
      .select('id')
      .single();

    if (insertResponse.error) {
      return { liked: false, changed: false, error: insertResponse.error };
    }

    const insertedLikeId = insertResponse.data?.id || null;

    if (insertedLikeId && safeArtistUserId && safeArtistUserId !== safeLikerUserId) {
      try {
        const senderName = String(likerDisplayName || '').trim() || await getArtistDisplayNameByUserId(safeLikerUserId, 'Someone');
        const body = `${senderName} heeft jouw tune geliked`;
        await supabaseClient.rpc('create_user_notification', {
          p_user_id: safeArtistUserId,
          p_type: 'tune_liked',
          p_title: 'New like',
          p_body: body,
          p_reward_seconds: 0,
          p_related_track_id: safeTrackId,
          p_related_user_id: safeLikerUserId,
          p_event_key: `track_like:${insertedLikeId}`
        });
      } catch (notificationErr) {
        console.error('toggleTrackLikeInSupabase notification error:', notificationErr);
      }
    }

    return { liked: true, changed: true, likeId: insertedLikeId, error: null };
  }

  function bindStandardHeaderEvents(els, options = {}) {
    const closeAll = () => closeStandardHeaderPanels(els, options.closeExtraPanels);
    if (els?.header?.showLoginBtn && typeof options.onLoginClick === 'function') {
      els.header.showLoginBtn.onclick = () => {
        closeAll();
        options.onLoginClick();
      };
    }
    if (els?.header?.headerAvatarBtn) {
      els.header.headerAvatarBtn.onclick = () => {
        if (typeof options.beforeAvatarAction === 'function') options.beforeAvatarAction();
        handleStandardHeaderAvatarAction(els, els?.header?.accountProfileLink?.href || 'artist.html', { navigate: options.navigate });
      };
    }
    if (els?.header?.accountProfileLink) {
      els.header.accountProfileLink.onclick = () => setHidden(els.header.accountMenu, true);
    }
    if (els?.header?.accountNotificationsLink) {
      els.header.accountNotificationsLink.onclick = () => setHidden(els.header.accountMenu, true);
    }
    if (els?.header?.logoutBtn && typeof options.onLogout === 'function') {
      els.header.logoutBtn.onclick = options.onLogout;
    }
    if (els?.desktopNav?.logoutBtn && typeof options.onLogout === 'function') {
      els.desktopNav.logoutBtn.onclick = options.onLogout;
    }
    document.addEventListener('click', (event) => {
      const target = event.target;
      const isHeaderMenu = target.closest('#accountMenu');
      const isAvatarButton = target.closest('#headerAvatarBtn');
      const isLoginButton = target.closest('#showLoginBtn');
      if (!isHeaderMenu && !isAvatarButton && !isLoginButton) setHidden(els?.header?.accountMenu, true);
      if (typeof options.isExtraPanelTarget === 'function' && !options.isExtraPanelTarget(target) && !isLoginButton) {
        if (typeof options.closeExtraPanels === 'function') options.closeExtraPanels();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setHidden(els?.header?.accountMenu, true);
        if (typeof options.closeExtraPanels === 'function') options.closeExtraPanels();
      }
    });
  }


  ensureMiniPlayerScript();

  window.SSFMApp = Object.assign(window.SSFMApp || {}, {
    config,
    COUNTRY_TO_ISO,
    getSupabaseClient,
    setHidden,
    setText,
    escapeHtml,
    formatTime,
    normalizeCoins,
    setCurrencyText,
    applyRuntimeCurrencySnapshotToElement,
    bindRuntimeCurrencySync,
    getProfileHref,
    getFlagEmoji,
    getFlagMarkup,
    getCurrentUserSafe,
    buildStandardShellEls,
    closeStandardHeaderPanels,
    setStandardHeaderAvatar,
    isMobileHeaderMenuMode,
    handleStandardHeaderAvatarAction,
    applyStandardMenuState,
    setStandardLoggedOutState,
    setStandardLoggedInState,
    fetchProfileByUserId,
    fetchTrackByUserId,
    getArtistDisplayNameByUserId,
    fetchLikedTrackIdsForUser,
    syncLikedTrackIdsForUser,
    toggleTrackLikeInSupabase,
    bindStandardHeaderEvents,
    hasCompletedArtistProfile,
    hasUnreadNotifications,
    setUnreadNotificationsFlag,
    syncUnreadNotificationsFlagForUser,
    updateNotificationIcons
  });
})();
