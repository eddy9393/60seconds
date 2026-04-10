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
    cachedSupabaseClient = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
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
    getCurrentUserSafe
  });
})();
