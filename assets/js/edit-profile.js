const { getSupabaseClient, getProfileHref: sharedGetProfileHref, bindRuntimeCurrencySync, applyRuntimeCurrencySnapshotToElement, getCurrentUserSafe } = window.SSFMApp;
const supabaseClient = getSupabaseClient();


function applyRuntimeCurrencySnapshot() {
  applyRuntimeCurrencySnapshotToElement(els.header?.currencyValue, els.header?.currencyBadge);
}

const COUNTRY_OPTIONS = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
  "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
  "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica",
  "Croatia","Cuba","Cyprus","Czech Republic","Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador",
  "Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France",
  "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau",
  "Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland",
  "Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar",
  "Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia",
  "Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal",
  "Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan",
  "Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar",
  "Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia",
  "Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa",
  "South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan",
  "Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan",
  "Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City",
  "Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
];

const ROLE_OPTIONS = ['none','vocalist','producer','dj','rapper','songwriter','composer','musician','band','engineer'];
const DEFAULT_NEW_ROLE = 'producer';

const els = {
  header: {
    showLoginBtn: document.getElementById("showLoginBtn"),
    headerAvatarBtn: document.getElementById("headerAvatarBtn"),
    headerAvatarImage: document.getElementById("headerAvatarImage"),
    headerAvatarFallback: document.getElementById("headerAvatarFallback"),
    accountMenu: document.getElementById("accountMenu"),
    accountProfileLink: document.getElementById("accountProfileLink"),
    accountNotificationsLink: document.getElementById("accountNotificationsLink"),
    logoutBtn: document.getElementById("logout"),
    currencyBadge: document.getElementById("currencyBadge"),
    currencyValue: document.getElementById("currencyValue")
  },
  desktopNav: {
    loginLink: document.getElementById("desktopLoginLink"),
    logoutBtn: document.getElementById("desktopLogoutBtn"),
    profileLink: document.getElementById("desktopProfileLink"),
    notificationsLink: document.getElementById("desktopNotificationsLink"),
    likedLink: document.getElementById("desktopLikedLink"),
    statsLink: document.getElementById("desktopStatsLink"),
    trackLink: document.getElementById("desktopTrackLink")
  },
  mobileNav: {
    loginLink: document.getElementById("mobileLoginLink"),
    profileLink: document.getElementById("mobileProfileLink"),
    notificationsLink: document.getElementById("mobileNotificationsLink"),
    likedLink: document.getElementById("mobileLikedLink"),
    trackLink: document.getElementById("mobileTrackLink")
  },
  auth: {
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    signupBtn: document.getElementById("signup"),
    loginBtn: document.getElementById("login"),
    authBox: document.getElementById("authBox"),
    userBox: document.getElementById("userBox"),
    authMessage: document.getElementById("authMessage"),
    profileLink: document.getElementById("profileLink")
  },
  page: {
    loginRequiredBox: document.getElementById("loginRequiredBox"),
    profileMissingBox: document.getElementById("profileMissingBox"),
    editFormWrap: document.getElementById("editFormWrap"),
    actionRow: document.getElementById("actionRow"),
    viewArtistLink: document.getElementById("viewArtistLink"),
    artistNameInput: document.getElementById("artistName"),
    bioInput: document.getElementById("bio"),
    nationalityInput: document.getElementById("nationality"),
    rolesWrap: document.getElementById("musicRolesWrap"),
    addRoleBtn: document.getElementById("addRoleBtn"),
    cityInput: document.getElementById("city"),
    dateOfBirthInput: document.getElementById("dateOfBirth"),
    showRoleOnArtistPageInput: document.getElementById("showRoleOnArtistPage"),
    showCityOnArtistPageInput: document.getElementById("showCityOnArtistPage"),
    showBirthOnArtistPageInput: document.getElementById("showBirthOnArtistPage"),
    socialLinkInput: document.getElementById("socialLink"),
    photoFileInput: document.getElementById("photoFile"),
    photoPreview: document.getElementById("photoPreview"),
    photoPreviewFallback: document.getElementById("photoPreviewFallback"),
    bioCount: document.getElementById("bioCount"),
    cityList: document.getElementById("cityList"),
    wantsPromotionsInput: document.getElementById("wantsPromotions"),
    saveProfileBtn: document.getElementById("saveProfileBtn"),
    status: document.getElementById("status")
  }
};

bindRuntimeCurrencySync(els.header?.currencyValue, els.header?.currencyBadge);

const state = { currentProfile: null, roleValues: ['none'] };
function setHidden(element, hidden) { if (element) element.classList.toggle('hidden', hidden); }
function setText(element, value) { if (element) element.textContent = value ?? ''; }
function setCurrency(value) { const amount = Number(value); setText(els.header.currencyValue, Number.isFinite(amount) ? String(Math.max(0, Math.floor(amount))) : '0'); }
function populateCountryOptions() { els.page.nationalityInput.innerHTML = '<option value="">Select your nationality</option>'; COUNTRY_OPTIONS.forEach((country) => { const option = document.createElement('option'); option.value = country; option.textContent = country; els.page.nationalityInput.appendChild(option); }); }
function normalizeRoleValue(value) { const safe = String(value || 'none').trim().toLowerCase(); return ROLE_OPTIONS.includes(safe) ? safe : 'none'; }
function getRoleLabel(role) { return role === 'none' ? 'None' : role.charAt(0).toUpperCase() + role.slice(1); }
function setAuthMessage(message, error = false) { let nextMessage = message; if (nextMessage === 'Auth session missing!') nextMessage = ''; setText(els.auth.authMessage, nextMessage || ''); els.auth.authMessage.style.color = error ? '#ff8a8a' : '#cfcfcf'; }
function setStatus(message, isError = false) { setText(els.page.status, message || ''); els.page.status.style.color = isError ? '#ff8a8a' : '#cfcfcf'; }
function clearLoginFields() { els.auth.email.value = ''; els.auth.password.value = ''; }
function closeMenus() { setHidden(els.auth.authBox, true); setHidden(els.header.accountMenu, true); }
function setHeaderAvatar(photoUrl, artistName) { if (photoUrl) { els.header.headerAvatarImage.src = photoUrl; setHidden(els.header.headerAvatarImage, false); setHidden(els.header.headerAvatarFallback, true); return; } setHidden(els.header.headerAvatarImage, true); setHidden(els.header.headerAvatarFallback, false); setText(els.header.headerAvatarFallback, (artistName || 'A').charAt(0).toUpperCase()); }

function isMobileHeaderMenuMode() {
  return window.matchMedia("(max-width: 768px)").matches;
}

function handleHeaderAvatarAction(profileHref) {
  const menuEl = els.header.accountMenu;
  if (isMobileHeaderMenuMode() && menuEl) {
    menuEl.classList.toggle("hidden");
    return;
  }
  if (menuEl) {
    menuEl.classList.add("hidden");
  }
  window.location.href = profileHref || "artist.html";
}

function applyMenuState(user, profile) { const isLoggedIn = Boolean(user); const hasProfile = Boolean(profile && String(profile.artist_name || '').trim()); setHidden(els.desktopNav.loginLink, isLoggedIn); setHidden(els.mobileNav.loginLink, isLoggedIn); setHidden(els.desktopNav.logoutBtn, !isLoggedIn); setHidden(els.desktopNav.profileLink, !isLoggedIn); setHidden(els.mobileNav.profileLink, !isLoggedIn); setHidden(els.desktopNav.notificationsLink, !isLoggedIn); setHidden(els.mobileNav.notificationsLink, !isLoggedIn); setHidden(els.desktopNav.likedLink, !isLoggedIn); setHidden(els.mobileNav.likedLink, !isLoggedIn); setHidden(els.desktopNav.statsLink, !isLoggedIn || !hasProfile); setHidden(els.desktopNav.trackLink, !isLoggedIn || !hasProfile); setHidden(els.mobileNav.trackLink, true); setHidden(els.header.accountProfileLink, !isLoggedIn); setHidden(els.header.accountNotificationsLink, true); }
function setLoggedOutView() { closeMenus(); setHidden(els.auth.userBox, true); setHidden(els.header.showLoginBtn, false); setHidden(els.header.headerAvatarBtn, true); setHidden(els.header.headerAvatarImage, true); setHidden(els.header.headerAvatarFallback, true); setHidden(els.header.currencyBadge, true); setCurrency(0); els.header.headerAvatarImage.src = ''; setHidden(els.page.loginRequiredBox, false); setHidden(els.page.profileMissingBox, true); setHidden(els.page.editFormWrap, true); setHidden(els.page.actionRow, true); els.page.viewArtistLink.href = '#'; state.currentProfile = null; applyMenuState(null, null); }
function setLoggedInView() { setHidden(els.auth.authBox, true); setHidden(els.auth.userBox, false); setHidden(els.header.showLoginBtn, true); setHidden(els.header.headerAvatarBtn, false);
  setHidden(els.header.accountMenu, true); setHidden(els.header.currencyBadge, false); setHidden(els.page.loginRequiredBox, true); }
function setProfileMissingView() { setHidden(els.page.profileMissingBox, false); setHidden(els.page.editFormWrap, true); setHidden(els.page.actionRow, true); }
function setProfileReadyView() { setHidden(els.page.profileMissingBox, true); setHidden(els.page.editFormWrap, false); setHidden(els.page.actionRow, false); }
function renderRoleRows() { const values = state.roleValues.length ? state.roleValues : ['none']; els.page.rolesWrap.innerHTML = ''; values.forEach((value, index) => { const row = document.createElement('div'); row.className = 'role-row'; const select = document.createElement('select'); select.className = 'field-select'; ROLE_OPTIONS.forEach((role) => { const option = document.createElement('option'); option.value = role; option.textContent = getRoleLabel(role); if (role === normalizeRoleValue(value)) option.selected = true; select.appendChild(option); }); const removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.className = 'role-remove-btn'; removeBtn.setAttribute('aria-label', 'Remove role'); removeBtn.innerHTML = '<span aria-hidden="true">−</span>'; removeBtn.disabled = values.length === 1; removeBtn.addEventListener('click', () => { state.roleValues.splice(index, 1); if (!state.roleValues.length) state.roleValues = ['none']; renderRoleRows(); }); select.addEventListener('change', (event) => { const nextValue = normalizeRoleValue(event.target.value); state.roleValues[index] = nextValue; if (nextValue === 'none') { state.roleValues = ['none']; renderRoleRows(); return; } state.roleValues = state.roleValues.filter((role, roleIndex) => roleIndex === index || normalizeRoleValue(role) !== 'none'); }); row.appendChild(select); row.appendChild(removeBtn); els.page.rolesWrap.appendChild(row); }); }
function getCleanRoles() { const normalized = state.roleValues.map(normalizeRoleValue); if (normalized.includes('none')) return ['none']; const unique = []; normalized.forEach((role) => { if (!unique.includes(role)) unique.push(role); }); return unique.length ? unique : ['none']; }
function setupCityAutocomplete() {
  const input = document.getElementById('city');
  const list = document.getElementById('citySuggestions');
  if (!input || !list) return;

  let timer = null;
  let picked = input.value || '';

  function render(results) {
    list.innerHTML = '';
    if (!results || !results.length) { list.style.display = 'none'; return; }
    results.slice(0, 8).forEach(function(r) {
      const parts = [r.name];
      if (r.admin1 && r.admin1 !== r.name) parts.push(r.admin1);
      if (r.country) parts.push(r.country);
      const label = parts.join(', ');
      const li = document.createElement('li');
      li.textContent = label;
      li.addEventListener('mousedown', function(e) {
        e.preventDefault();
        picked = r.name;
        input.value = r.name;
        list.style.display = 'none';
      });
      list.appendChild(li);
    });
    list.style.display = 'block';
  }

  input.addEventListener('input', function() {
    const q = input.value.trim();
    picked = '';
    clearTimeout(timer);
    if (q.length < 2) { list.style.display = 'none'; return; }
    timer = setTimeout(function() {
      fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=8&language=en&format=json')
        .then(function(res) { return res.json(); })
        .then(function(data) { render(data.results || []); })
        .catch(function(err) { console.warn('City lookup failed:', err); list.style.display = 'none'; });
    }, 350);
  });

  input.addEventListener('blur', function() {
    setTimeout(function() {
      list.style.display = 'none';
      if (!picked) input.value = '';
    }, 250);
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { list.style.display = 'none'; input.value = picked; }
  });
}

function setupBioCounter() {
  const bio = document.getElementById('bio');
  const counter = document.getElementById('bioCount');
  if (!bio || !counter) return;
  function update() {
    const len = bio.value.length;
    counter.textContent = len + '/250';
    counter.style.color = len > 220 ? 'rgba(255,140,0,0.8)' : 'rgba(255,255,255,0.35)';
  }
  bio.addEventListener('input', update);
  update();
}

function setupPhotoPreview() {
  const input = document.getElementById('photoFile');
  const preview = document.getElementById('photoPreview');
  const empty = document.getElementById('photoPreviewEmpty');

  if (!input || !preview) return;

  input.addEventListener('change', function() {
    const file = this.files && this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
      if (empty) empty.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  });
}

function fillProfileForm(profile) { els.page.artistNameInput.value = profile?.artist_name || ''; els.page.bioInput.value = profile?.bio || ''; els.page.nationalityInput.value = profile?.nationality || ''; const roles = Array.isArray(profile?.music_roles) && profile.music_roles.length ? profile.music_roles : [profile?.music_role || 'none']; state.roleValues = roles.map(normalizeRoleValue); renderRoleRows(); els.page.cityInput.value = profile?.city || ''; els.page.dateOfBirthInput.value = profile?.date_of_birth || ''; els.page.showRoleOnArtistPageInput.checked = Boolean(profile?.show_role_on_artist_page); els.page.showCityOnArtistPageInput.checked = Boolean(profile?.show_city_on_artist_page); els.page.showBirthOnArtistPageInput.checked = Boolean(profile?.show_birth_on_artist_page); els.page.socialLinkInput.value = profile?.social_link || ''; els.page.wantsPromotionsInput.checked = Boolean(profile?.wants_promotions);
  const photoPreview = document.getElementById('photoPreview');
  const photoEmpty = document.getElementById('photoPreviewEmpty');
  if (photoPreview) {
    if (profile?.photo_url) {
      photoPreview.src = profile.photo_url;
      photoPreview.classList.remove('hidden');
      if (photoEmpty) photoEmpty.classList.add('hidden');
    } else {
      photoPreview.removeAttribute('src');
      photoPreview.classList.add('hidden');
      if (photoEmpty) photoEmpty.classList.remove('hidden');
    }
  }
}
async function ensureProfileRecord(userId) { if (!userId) return null; const { error } = await supabaseClient.from('profiles').insert([{ user_id: userId }]); if (error && error.code !== '23505') throw error; const { data, error: reloadError } = await supabaseClient.from('profiles').select('artist_name, bio, nationality, music_roles, music_role, city, date_of_birth, social_link, photo_url, wants_promotions, accepted_terms, user_id, coins, show_role_on_artist_page, show_city_on_artist_page, show_birth_on_artist_page').eq('user_id', userId).maybeSingle(); if (reloadError) throw reloadError; return data || null; }
async function loadMyProfile(userId) { let { data, error } = await supabaseClient.from('profiles').select('artist_name, bio, nationality, music_roles, music_role, city, date_of_birth, social_link, photo_url, wants_promotions, accepted_terms, user_id, coins, show_role_on_artist_page, show_city_on_artist_page, show_birth_on_artist_page').eq('user_id', userId).maybeSingle(); if (error) { state.currentProfile = null; els.auth.profileLink.href = '#'; els.page.viewArtistLink.href = '#'; setHeaderAvatar('', 'A'); fillProfileForm(null); setProfileMissingView(); applyMenuState({ id: userId }, null); return null; } if (!data) { try { data = await ensureProfileRecord(userId); } catch (ensureError) { console.error('ensureProfileRecord error:', ensureError); state.currentProfile = null; els.auth.profileLink.href = '#'; els.page.viewArtistLink.href = '#'; setHeaderAvatar('', 'A'); fillProfileForm(null); setProfileMissingView(); applyMenuState({ id: userId }, null); return null; } } state.currentProfile = data; setCurrency(data.coins || 0); setHeaderAvatar(data.photo_url, data.artist_name); const profileHref = String(data.artist_name || '').trim() ? `artist.html?user_id=${encodeURIComponent(data.user_id)}` : 'edit-profile.html?welcome=1'; els.auth.profileLink.href = profileHref; els.page.viewArtistLink.href = String(data.artist_name || '').trim() ? profileHref : '#'; fillProfileForm(data); setProfileReadyView(); applyMenuState({ id: userId }, data); return data; }
async function refreshAuthUI() { try { const user = await getCurrentUserSafe(); if (user) { setLoggedInView(); const profile = await loadMyProfile(user.id); const params = new URLSearchParams(window.location.search); if (params.get('welcome') === '1' && (!profile || !String(profile.artist_name || '').trim())) { setStatus("You're one step away — create your artist profile to unlock your artist page, submit your tune, and start sharing your sound."); params.delete('welcome'); const nextQuery = params.toString(); history.replaceState({}, document.title, `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`); } return user; } setLoggedOutView(); state.currentProfile = null; fillProfileForm(null); return null; } catch (err) { console.error('refreshAuthUI error:', err); setLoggedOutView(); state.currentProfile = null; fillProfileForm(null); return null; } }
async function handleLogin() { const emailValue = els.auth.email.value.trim(); const passwordValue = els.auth.password.value.trim(); if (!emailValue || !passwordValue) { setAuthMessage('Please enter email and password.', true); return; } const originalLoginLabel = els.auth.loginBtn.textContent; const originalSignupLabel = els.auth.signupBtn.textContent; els.auth.loginBtn.disabled = true; els.auth.signupBtn.disabled = true; els.auth.loginBtn.textContent = 'Logging in...'; setAuthMessage(''); try { const { error } = await supabaseClient.auth.signInWithPassword({ email: emailValue, password: passwordValue }); if (error) { setAuthMessage(error.message, true); return; } clearLoginFields(); setStatus(''); await refreshAuthUI(); } catch (err) { console.error('handleLogin error:', err); setAuthMessage('Login failed. Try again.', true); } finally { els.auth.loginBtn.disabled = false; els.auth.signupBtn.disabled = false; els.auth.loginBtn.textContent = originalLoginLabel; els.auth.signupBtn.textContent = originalSignupLabel; } }
async function handleSignup() { const emailValue = els.auth.email.value.trim(); const passwordValue = els.auth.password.value.trim(); if (!emailValue || !passwordValue) { setAuthMessage('Please enter email and password.', true); return; } const originalLoginLabel = els.auth.loginBtn.textContent; const originalSignupLabel = els.auth.signupBtn.textContent; els.auth.loginBtn.disabled = true; els.auth.signupBtn.disabled = true; els.auth.signupBtn.textContent = 'Creating account...'; setAuthMessage(''); try { const { error } = await supabaseClient.auth.signUp({ email: emailValue, password: passwordValue, options: { emailRedirectTo: 'https://www.60seconds.fm/confirm.html?next=edit-profile.html%3Fwelcome%3D1' } }); if (error) { setAuthMessage(error.message, true); return; } setAuthMessage('Account created. Check your email.'); await refreshAuthUI(); } catch (err) { console.error('handleSignup error:', err); setAuthMessage('Sign up failed. Try again.', true); } finally { els.auth.loginBtn.disabled = false; els.auth.signupBtn.disabled = false; els.auth.loginBtn.textContent = originalLoginLabel; els.auth.signupBtn.textContent = originalSignupLabel; } }
async function handleLogout() { els.header.logoutBtn.disabled = true; els.desktopNav.logoutBtn.disabled = true; setAuthMessage(''); try { const { error } = await supabaseClient.auth.signOut(); if (error) { setAuthMessage(error.message, true); return; } clearLoginFields(); state.currentProfile = null; setStatus(''); await refreshAuthUI(); } catch (err) { console.error('handleLogout error:', err); setAuthMessage('Logout failed. Try again.', true); } finally { els.header.logoutBtn.disabled = false; els.desktopNav.logoutBtn.disabled = false; } }
async function uploadPhotoIfNeeded(userId, photoFile) { if (!photoFile) return state.currentProfile?.photo_url || ''; const photoPath = `${userId}/${Date.now()}-${photoFile.name.replace(/\s+/g, '-')}`; const { error: photoUploadError } = await supabaseClient.storage.from('artist-photos').upload(photoPath, photoFile, { cacheControl: '3600', upsert: true }); if (photoUploadError) throw new Error('Photo upload failed: ' + photoUploadError.message); const { data: photoUrlData } = supabaseClient.storage.from('artist-photos').getPublicUrl(photoPath); return photoUrlData.publicUrl; }
async function handleSaveProfile() { const artistName = els.page.artistNameInput.value.trim(); const bio = els.page.bioInput.value.trim(); const nationality = els.page.nationalityInput.value.trim(); const musicRoles = getCleanRoles(); const city = els.page.cityInput.value.trim(); const dateOfBirth = els.page.dateOfBirthInput.value; const socialLink = els.page.socialLinkInput.value.trim(); const photoFile = els.page.photoFileInput.files[0]; const wantsPromotions = els.page.wantsPromotionsInput.checked; const showRoleOnArtistPage = els.page.showRoleOnArtistPageInput.checked; const showCityOnArtistPage = els.page.showCityOnArtistPageInput.checked; const showBirthOnArtistPage = els.page.showBirthOnArtistPageInput.checked; if (!artistName) { setStatus('Please enter your (artist)name.', true); return; } const originalSaveLabel = els.page.saveProfileBtn.textContent; els.page.saveProfileBtn.disabled = true; els.page.saveProfileBtn.textContent = 'Saving profile...'; setStatus('Checking login...'); try { const currentUser = await getCurrentUserSafe(); if (!currentUser) { setStatus('You must be logged in before editing your profile.', true); return; } const userId = currentUser.id; if (!state.currentProfile) { setStatus('Preparing your artist profile...'); state.currentProfile = await ensureProfileRecord(userId); if (!state.currentProfile) { setStatus('Could not prepare your artist profile. Please try again.', true); setProfileMissingView(); return; } } const photoUrl = await uploadPhotoIfNeeded(userId, photoFile); setStatus('Saving profile...'); const payload = { artist_name: artistName, bio: bio || null, nationality: nationality || null, music_roles: musicRoles, music_role: musicRoles.includes('none') ? 'none' : musicRoles[0], city: city || null, date_of_birth: dateOfBirth || null, show_role_on_artist_page: showRoleOnArtistPage, show_city_on_artist_page: showCityOnArtistPage, show_birth_on_artist_page: showBirthOnArtistPage, social_link: socialLink || null, photo_url: photoUrl || null, wants_promotions: wantsPromotions, accepted_terms: state.currentProfile?.accepted_terms ?? true }; const { error: profileError } = await supabaseClient.from('profiles').update(payload).eq('user_id', userId); if (profileError) { setStatus('Saving profile failed: ' + profileError.message, true); return; } els.page.photoFileInput.value = ''; setStatus('Profile updated successfully.'); await loadMyProfile(userId); window.location.href = `artist.html?user_id=${encodeURIComponent(userId)}`; } catch (err) { console.error('save profile error:', err); setStatus(err.message || 'Something went wrong while saving your profile.', true); } finally { els.page.saveProfileBtn.disabled = false; els.page.saveProfileBtn.textContent = originalSaveLabel; } }
function bindEvents() { els.header.showLoginBtn.onclick = () => { setHidden(els.header.accountMenu, true); els.auth.authBox.classList.toggle('hidden'); setAuthMessage(''); if (!els.auth.authBox.classList.contains('hidden')) setTimeout(() => els.auth.email.focus(), 0); }; els.header.headerAvatarBtn.onclick = () => { setHidden(els.auth.authBox, true); setHidden(els.header.accountMenu, true); window.location.href = 'artist.html'; }; if (els.header.accountProfileLink) { els.header.accountProfileLink.onclick = () => { setHidden(els.header.accountMenu, true); }; } if (els.header.accountNotificationsLink) { els.header.accountNotificationsLink.onclick = () => { setHidden(els.header.accountMenu, true); }; } els.desktopNav.logoutBtn.onclick = handleLogout; els.header.logoutBtn.onclick = handleLogout; els.auth.loginBtn.onclick = handleLogin; els.auth.signupBtn.onclick = handleSignup; els.page.saveProfileBtn.onclick = handleSaveProfile; els.page.addRoleBtn.onclick = () => { if (state.roleValues.length === 1 && normalizeRoleValue(state.roleValues[0]) === 'none') state.roleValues = []; state.roleValues.push(DEFAULT_NEW_ROLE); renderRoleRows(); }; document.addEventListener('click', (e) => { const insideHeaderRight = e.target.closest('.header-right'); const insideAuthBox = e.target.closest('#authBox'); const isLoginButton = e.target.closest('#showLoginBtn'); const isAvatarButton = e.target.closest('#headerAvatarBtn'); if (!insideHeaderRight && !insideAuthBox && !isLoginButton && !isAvatarButton) { setHidden(els.auth.authBox, true); setHidden(els.header.accountMenu, true); } }); document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setHidden(els.auth.authBox, true); setHidden(els.header.accountMenu, true); } }); els.auth.email.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); }); els.auth.password.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); }); supabaseClient.auth.onAuthStateChange(() => { refreshAuthUI().catch((err) => console.error(err)); }); }
populateCountryOptions();
renderRoleRows();
bindEvents();
setupPhotoPreview();
refreshAuthUI().catch((err) => console.error('init edit profile error:', err));
