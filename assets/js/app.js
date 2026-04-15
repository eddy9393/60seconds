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

  async function getCurrentUserSafe() {
    const supabaseClient = getSupabaseClient();
    const sessionResponse = await supabaseClient.auth.getSession();
    if (sessionResponse.error) throw sessionResponse.error;
    const sessionUser = sessionResponse.data?.session?.user || null;
    if (sessionUser) return sessionUser;
    const userResponse = await supabaseClient.auth.getUser();
    if (userResponse.error) throw userResponse.error;
    return userResponse.data?.user || null;
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
        trackLink: doc.getElementById('desktopTrackLink')
      },
      mobileNav: {
        loginLink: doc.getElementById('mobileLoginLink'),
        profileLink: doc.getElementById('mobileProfileLink'),
        notificationsLink: doc.getElementById('mobileNotificationsLink'),
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
    const hasProfile = Boolean(profile);
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

    setHidden(els?.desktopNav?.trackLink, !isLoggedIn || !hasProfile);
    setHidden(els?.mobileNav?.trackLink, !isLoggedIn || !hasProfile);

    if (els?.desktopNav?.profileLink) els.desktopNav.profileLink.href = profileHref;
    if (els?.mobileNav?.profileLink) els.mobileNav.profileLink.href = profileHref;
    if (els?.header?.accountProfileLink) els.header.accountProfileLink.href = profileHref;
    setHidden(els?.header?.accountProfileLink, !isLoggedIn);

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
  }

  function setStandardLoggedOutState(els, options = {}) {
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
    bindStandardHeaderEvents
  });
})();
