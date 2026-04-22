const {
  getSupabaseClient,
  buildStandardShellEls,
  bindRuntimeCurrencySync,
  setStandardHeaderAvatar,
  applyStandardMenuState,
  setStandardLoggedOutState,
  setStandardLoggedInState,
  bindStandardHeaderEvents,
  fetchProfileByUserId,
  fetchTrackByUserId,
  getCurrentUserSafe,
  hasCompletedArtistProfile
} = window.SSFMApp;

const supabaseClient = getSupabaseClient();

const els = {
  shell: buildStandardShellEls(),
  page: {
    loginRequired: document.getElementById('storeLoginRequired'),
    storeWrap: document.getElementById('storeWrap'),
    balanceValue: document.getElementById('storeBalanceValue')
  }
};

const state = {
  profile: null,
  track: null,
  user: null
};

function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle('hidden', hidden);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function setBalance(coins) {
  const safeCoins = Math.max(0, Number(coins) || 0);
  if (els.page.balanceValue) els.page.balanceValue.textContent = formatNumber(safeCoins);
}

function renderLoggedOut() {
  state.user = null;
  state.profile = null;
  state.track = null;
  setStandardLoggedOutState(els.shell);
  setHidden(els.page.loginRequired, false);
  setHidden(els.page.storeWrap, true);
  setBalance(0);
}

function renderLoggedIn(user, profile, track) {
  state.user = user;
  state.profile = profile || null;
  state.track = track || null;

  setStandardLoggedInState(els.shell, { coins: profile?.coins || 0 });
  setStandardHeaderAvatar(els.shell, profile?.photo_url || '', profile?.artist_name || user?.email || 'A');
  applyStandardMenuState(els.shell, user, profile, track);

  setHidden(els.page.loginRequired, true);
  setHidden(els.page.storeWrap, false);
  setBalance(profile?.coins || 0);
}

async function handleLogout() {
  try {
    await supabaseClient.auth.signOut();
  } catch (error) {
    console.error('store logout error:', error);
  } finally {
    window.location.href = 'index.html';
  }
}

async function loadPage() {
  const user = await getCurrentUserSafe();
  if (!user) {
    renderLoggedOut();
    return;
  }

  const [profile, track] = await Promise.all([
    fetchProfileByUserId(user.id, 'user_id, artist_name, photo_url, coins'),
    fetchTrackByUserId(user.id, 'id, user_id')
  ]);

  if (!hasCompletedArtistProfile(profile)) {
    renderLoggedIn(user, profile, track);
    return;
  }

  renderLoggedIn(user, profile, track);
}

function bindEvents() {
  bindStandardHeaderEvents(els.shell, {
    onLogout: handleLogout
  });

  bindRuntimeCurrencySync(els.shell.header.currencyValue, els.shell.header.currencyBadge);
  window.addEventListener('ssfm:coins-updated', (event) => {
    const coins = event?.detail?.coins;
    if (typeof coins !== 'undefined') setBalance(coins);
  });

  supabaseClient.auth.onAuthStateChange(() => {
    loadPage().catch((error) => console.error('store auth sync error:', error));
  });
}

async function initPage() {
  bindEvents();
  await loadPage();
}

initPage().catch((error) => {
  console.error('store init error:', error);
  renderLoggedOut();
});
