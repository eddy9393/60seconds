const supabaseClient = window.supabase.createClient(
  "https://rgoutegbcpjytplqcwze.supabase.co",
  "sb_publishable_255qyDKS77nMU0pbedfa_A_3hdgtEHh"
);

const MUSIC_ROLE_OPTIONS = [
  "",
  "Vocalist",
  "Producer",
  "Singer",
  "Rapper",
  "Songwriter",
  "Singer-Songwriter",
  "DJ",
  "Beatmaker",
  "Instrumentalist",
  "Composer"
];

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
    trackLink: document.getElementById("desktopTrackLink")
  },

  mobileNav: {
    loginLink: document.getElementById("mobileLoginLink"),
    profileLink: document.getElementById("mobileProfileLink"),
    notificationsLink: document.getElementById("mobileNotificationsLink"),
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
    musicRoleInput: document.getElementById("musicRole"),
    cityInput: document.getElementById("city"),
    dateOfBirthInput: document.getElementById("dateOfBirth"),
    showRoleOnArtistPageInput: document.getElementById("showRoleOnArtistPage"),
    showCityOnArtistPageInput: document.getElementById("showCityOnArtistPage"),
    showBirthOnArtistPageInput: document.getElementById("showBirthOnArtistPage"),
    socialLinkInput: document.getElementById("socialLink"),
    photoFileInput: document.getElementById("photoFile"),
    wantsPromotionsInput: document.getElementById("wantsPromotions"),
    saveProfileBtn: document.getElementById("saveProfileBtn"),
    status: document.getElementById("status")
  }
};

const state = {
  currentProfile: null
};

function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle("hidden", hidden);
}

function setText(element, value) {
  if (!element) return;
  element.textContent = value ?? "";
}

function setCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    setText(els.header.currencyValue, "0");
    return;
  }

  setText(els.header.currencyValue, String(Math.max(0, Math.floor(amount))));
}

function populateCountryOptions() {
  els.page.nationalityInput.innerHTML = '<option value="">None</option>';

  COUNTRY_OPTIONS.forEach((country) => {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    els.page.nationalityInput.appendChild(option);
  });
}

function populateMusicRoleOptions() {
  els.page.musicRoleInput.innerHTML = "";

  MUSIC_ROLE_OPTIONS.forEach((role) => {
    const option = document.createElement("option");
    option.value = role;
    option.textContent = role || "None";
    els.page.musicRoleInput.appendChild(option);
  });
}

function setAuthMessage(message, error = false) {
  let nextMessage = message;
  if (nextMessage === "Auth session missing!") {
    nextMessage = "";
  }

  setText(els.auth.authMessage, nextMessage || "");
  els.auth.authMessage.style.color = error ? "#ff8a8a" : "#cfcfcf";
}

function setStatus(message, isError = false) {
  setText(els.page.status, message || "");
  els.page.status.style.color = isError ? "#ff8a8a" : "#cfcfcf";
}

function clearLoginFields() {
  els.auth.email.value = "";
  els.auth.password.value = "";
}

function closeMenus() {
  setHidden(els.auth.authBox, true);
  setHidden(els.header.accountMenu, true);
}

function setHeaderAvatar(photoUrl, artistName) {
  if (photoUrl) {
    els.header.headerAvatarImage.src = photoUrl;
    setHidden(els.header.headerAvatarImage, false);
    setHidden(els.header.headerAvatarFallback, true);
    return;
  }

  setHidden(els.header.headerAvatarImage, true);
  setHidden(els.header.headerAvatarFallback, false);
  setText(els.header.headerAvatarFallback, (artistName || "A").charAt(0).toUpperCase());
}

function applyMenuState(user, profile) {
  const isLoggedIn = Boolean(user);
  const hasProfile = Boolean(profile);

  setHidden(els.desktopNav.loginLink, isLoggedIn);
  setHidden(els.mobileNav.loginLink, isLoggedIn);
  setHidden(els.desktopNav.logoutBtn, !isLoggedIn);

  setHidden(els.desktopNav.profileLink, !isLoggedIn);
  setHidden(els.mobileNav.profileLink, !isLoggedIn);

  setHidden(els.desktopNav.notificationsLink, !isLoggedIn);
  setHidden(els.mobileNav.notificationsLink, !isLoggedIn);

  setHidden(els.desktopNav.trackLink, !isLoggedIn || !hasProfile);
  setHidden(els.mobileNav.trackLink, !isLoggedIn || !hasProfile);

  setHidden(els.header.accountProfileLink, !isLoggedIn);
  setHidden(els.header.accountNotificationsLink, !isLoggedIn);
}

function setLoggedOutView() {
  closeMenus();

  setHidden(els.auth.userBox, true);
  setHidden(els.header.showLoginBtn, false);
  setHidden(els.header.headerAvatarBtn, true);
  setHidden(els.header.headerAvatarImage, true);
  setHidden(els.header.headerAvatarFallback, true);
  setHidden(els.header.currencyBadge, true);
  setCurrency(0);
  els.header.headerAvatarImage.src = "";

  setHidden(els.page.loginRequiredBox, false);
  setHidden(els.page.profileMissingBox, true);
  setHidden(els.page.editFormWrap, true);
  setHidden(els.page.actionRow, true);

  els.page.viewArtistLink.href = "#";
  state.currentProfile = null;

  applyMenuState(null, null);
}

function setLoggedInView() {
  setHidden(els.auth.authBox, true);
  setHidden(els.auth.userBox, false);
  setHidden(els.header.showLoginBtn, true);
  setHidden(els.header.headerAvatarBtn, false);
  setHidden(els.header.currencyBadge, false);
  setHidden(els.page.loginRequiredBox, true);
}

function setProfileMissingView() {
  setHidden(els.page.profileMissingBox, false);
  setHidden(els.page.editFormWrap, true);
  setHidden(els.page.actionRow, true);
}

function setProfileReadyView() {
  setHidden(els.page.profileMissingBox, true);
  setHidden(els.page.editFormWrap, false);
  setHidden(els.page.actionRow, false);
}

function fillProfileForm(profile) {
  els.page.artistNameInput.value = profile?.artist_name || "";
  els.page.bioInput.value = profile?.bio || "";
  els.page.nationalityInput.value = profile?.nationality || "";
  els.page.musicRoleInput.value = profile?.music_role || "";
  els.page.cityInput.value = profile?.city || "";
  els.page.dateOfBirthInput.value = profile?.date_of_birth || "";
  els.page.showRoleOnArtistPageInput.checked = Boolean(profile?.show_role_on_artist_page);
  els.page.showCityOnArtistPageInput.checked = Boolean(profile?.show_city_on_artist_page);
  els.page.showBirthOnArtistPageInput.checked = Boolean(profile?.show_birth_on_artist_page);
  els.page.socialLinkInput.value = profile?.social_link || "";
  els.page.wantsPromotionsInput.checked = Boolean(profile?.wants_promotions);
}

async function loadMyProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("artist_name, bio, nationality, music_role, city, date_of_birth, show_role_on_artist_page, show_city_on_artist_page, show_birth_on_artist_page, social_link, photo_url, wants_promotions, accepted_terms, user_id, coins")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    state.currentProfile = null;
    els.auth.profileLink.href = "#";
    els.page.viewArtistLink.href = "#";
    setHeaderAvatar("", "A");
    fillProfileForm(null);
    setProfileMissingView();
    applyMenuState({ id: userId }, null);
    return null;
  }

  state.currentProfile = data;
  setCurrency(data.coins || 0);
  setHeaderAvatar(data.photo_url, data.artist_name);

  const artistHref = `artist.html?user_id=${encodeURIComponent(data.user_id)}`;
  els.auth.profileLink.href = artistHref;
  els.page.viewArtistLink.href = artistHref;

  fillProfileForm(data);
  setProfileReadyView();
  applyMenuState({ id: userId }, data);

  return data;
}

async function refreshAuthUI() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      setLoggedOutView();
      state.currentProfile = null;
      fillProfileForm(null);
      return null;
    }

    const user = data?.session?.user || null;

    if (user) {
      setLoggedInView();
      await loadMyProfile(user.id);
      return user;
    }

    setLoggedOutView();
    state.currentProfile = null;
    fillProfileForm(null);
    return null;
  } catch (err) {
    console.error("refreshAuthUI error:", err);
    setLoggedOutView();
    state.currentProfile = null;
    fillProfileForm(null);
    return null;
  }
}

async function handleLogin() {
  const emailValue = els.auth.email.value.trim();
  const passwordValue = els.auth.password.value.trim();

  if (!emailValue || !passwordValue) {
    setAuthMessage("Please enter email and password.", true);
    return;
  }

  els.auth.loginBtn.disabled = true;
  els.auth.signupBtn.disabled = true;
  setAuthMessage("");

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue
    });

    if (error) {
      setAuthMessage(error.message, true);
      return;
    }

    clearLoginFields();
    setStatus("");
    await refreshAuthUI();
  } catch (err) {
    console.error("handleLogin error:", err);
    setAuthMessage("Login failed. Try again.", true);
  } finally {
    els.auth.loginBtn.disabled = false;
    els.auth.signupBtn.disabled = false;
  }
}

async function handleSignup() {
  const emailValue = els.auth.email.value.trim();
  const passwordValue = els.auth.password.value.trim();

  if (!emailValue || !passwordValue) {
    setAuthMessage("Please enter email and password.", true);
    return;
  }

  els.auth.loginBtn.disabled = true;
  els.auth.signupBtn.disabled = true;
  setAuthMessage("");

  try {
    const { error } = await supabaseClient.auth.signUp({
      email: emailValue,
      password: passwordValue
    });

    if (error) {
      setAuthMessage(error.message, true);
      return;
    }

    setAuthMessage("Account created. Check your email.");
    await refreshAuthUI();
  } catch (err) {
    console.error("handleSignup error:", err);
    setAuthMessage("Sign up failed. Try again.", true);
  } finally {
    els.auth.loginBtn.disabled = false;
    els.auth.signupBtn.disabled = false;
  }
}

async function handleLogout() {
  els.header.logoutBtn.disabled = true;
  els.desktopNav.logoutBtn.disabled = true;
  setAuthMessage("");

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      setAuthMessage(error.message, true);
      return;
    }

    clearLoginFields();
    state.currentProfile = null;
    setStatus("");
    await refreshAuthUI();
  } catch (err) {
    console.error("handleLogout error:", err);
    setAuthMessage("Logout failed. Try again.", true);
  } finally {
    els.header.logoutBtn.disabled = false;
    els.desktopNav.logoutBtn.disabled = false;
  }
}

async function uploadPhotoIfNeeded(userId, photoFile) {
  if (!photoFile) {
    return state.currentProfile?.photo_url || "";
  }

  const photoPath = `${userId}/${Date.now()}-${photoFile.name.replace(/\s+/g, "-")}`;

  const { error: photoUploadError } = await supabaseClient
    .storage
    .from("artist-photos")
    .upload(photoPath, photoFile, {
      cacheControl: "3600",
      upsert: true
    });

  if (photoUploadError) {
    throw new Error("Photo upload failed: " + photoUploadError.message);
  }

  const { data: photoUrlData } = supabaseClient
    .storage
    .from("artist-photos")
    .getPublicUrl(photoPath);

  return photoUrlData.publicUrl;
}

async function handleSaveProfile() {
  const artistName = els.page.artistNameInput.value.trim();
  const bio = els.page.bioInput.value.trim();
  const nationality = els.page.nationalityInput.value.trim();
  const musicRole = els.page.musicRoleInput.value.trim();
  const city = els.page.cityInput.value.trim();
  const dateOfBirth = els.page.dateOfBirthInput.value;
  const showRoleOnArtistPage = els.page.showRoleOnArtistPageInput.checked;
  const showCityOnArtistPage = els.page.showCityOnArtistPageInput.checked;
  const showBirthOnArtistPage = els.page.showBirthOnArtistPageInput.checked;
  const socialLink = els.page.socialLinkInput.value.trim();
  const photoFile = els.page.photoFileInput.files[0];
  const wantsPromotions = els.page.wantsPromotionsInput.checked;

  if (!artistName) {
    setStatus("Please enter your artist name.", true);
    return;
  }

  els.page.saveProfileBtn.disabled = true;
  setStatus("Checking login...");

  try {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();

    if (userError) {
      setStatus("Could not check current user: " + userError.message, true);
      return;
    }

    if (!userData.user) {
      setStatus("You must be logged in before editing your profile.", true);
      return;
    }

    const userId = userData.user.id;

    if (!state.currentProfile) {
      setStatus("No artist profile found. Please create your profile first.", true);
      setProfileMissingView();
      return;
    }

    const photoUrl = await uploadPhotoIfNeeded(userId, photoFile);

    setStatus("Saving profile...");

    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({
        artist_name: artistName,
        bio: bio || null,
        nationality: nationality || null,
        music_role: musicRole || null,
        city: city || null,
        date_of_birth: dateOfBirth || null,
        show_role_on_artist_page: showRoleOnArtistPage,
        show_city_on_artist_page: showCityOnArtistPage,
        show_birth_on_artist_page: showBirthOnArtistPage,
        social_link: socialLink || null,
        photo_url: photoUrl || null,
        wants_promotions: wantsPromotions,
        accepted_terms: state.currentProfile?.accepted_terms ?? true
      })
      .eq("user_id", userId);

    if (profileError) {
      setStatus("Saving profile failed: " + profileError.message, true);
      return;
    }

    els.page.photoFileInput.value = "";
    setStatus("Profile updated successfully.");

    await loadMyProfile(userId);

    window.location.href = `artist.html?user_id=${encodeURIComponent(userId)}`;
  } catch (err) {
    console.error("save profile error:", err);
    setStatus(err.message || "Something went wrong while saving your profile.", true);
  } finally {
    els.page.saveProfileBtn.disabled = false;
  }
}

function bindEvents() {
  els.header.showLoginBtn.onclick = () => {
    setHidden(els.header.accountMenu, true);
    els.auth.authBox.classList.toggle("hidden");
    setAuthMessage("");

    if (!els.auth.authBox.classList.contains("hidden")) {
      setTimeout(() => els.auth.email.focus(), 0);
    }
  };

  els.header.headerAvatarBtn.onclick = () => {
    setHidden(els.auth.authBox, true);
    els.header.accountMenu.classList.toggle("hidden");
  };

  els.header.accountProfileLink.onclick = () => {
    setHidden(els.header.accountMenu, true);
  };

  els.header.accountNotificationsLink.onclick = () => {
    setHidden(els.header.accountMenu, true);
  };

  els.desktopNav.logoutBtn.onclick = handleLogout;
  els.header.logoutBtn.onclick = handleLogout;
  els.auth.loginBtn.onclick = handleLogin;
  els.auth.signupBtn.onclick = handleSignup;
  els.page.saveProfileBtn.onclick = handleSaveProfile;

  document.addEventListener("click", (e) => {
    const insideHeaderRight = e.target.closest(".header-right");
    const insideAuthBox = e.target.closest("#authBox");
    const isLoginButton = e.target.closest("#showLoginBtn");
    const isAvatarButton = e.target.closest("#headerAvatarBtn");

    if (!insideHeaderRight && !insideAuthBox && !isLoginButton && !isAvatarButton) {
      setHidden(els.auth.authBox, true);
      setHidden(els.header.accountMenu, true);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setHidden(els.auth.authBox, true);
      setHidden(els.header.accountMenu, true);
    }
  });

  els.auth.email.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });

  els.auth.password.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });

  supabaseClient.auth.onAuthStateChange(() => {
    refreshAuthUI().catch((err) => console.error(err));
  });
}

async function initPage() {
  populateCountryOptions();
  populateMusicRoleOptions();
  setLoggedOutView();
  fillProfileForm(null);
  setStatus("");
  bindEvents();
  await refreshAuthUI();
}

initPage().catch((err) => {
  console.error("initPage error:", err);
});
