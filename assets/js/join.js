const supabaseClient = window.supabase.createClient(
  "https://rgoutegbcpjytplqcwze.supabase.co",
  "sb_publishable_255qyDKS77nMU0pbedfa_A_3hdgtEHh"
);

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
  showLoginBtn: document.getElementById("showLoginBtn"),
  headerAvatarBtn: document.getElementById("headerAvatarBtn"),
  headerAvatarImage: document.getElementById("headerAvatarImage"),
  headerAvatarFallback: document.getElementById("headerAvatarFallback"),
  accountMenu: document.getElementById("accountMenu"),
  accountProfileLink: document.getElementById("accountProfileLink"),
  accountNotificationsLink: document.getElementById("accountNotificationsLink"),
  currencyBadge: document.getElementById("currencyBadge"),
  currencyValue: document.getElementById("currencyValue"),

  desktopLoginLink: document.getElementById("desktopLoginLink"),
  desktopLogoutBtn: document.getElementById("desktopLogoutBtn"),
  desktopProfileLink: document.getElementById("desktopProfileLink"),
  desktopNotificationsLink: document.getElementById("desktopNotificationsLink"),
  desktopTrackLink: document.getElementById("desktopTrackLink"),

  mobileLoginLink: document.getElementById("mobileLoginLink"),
  mobileProfileLink: document.getElementById("mobileProfileLink"),
  mobileNotificationsLink: document.getElementById("mobileNotificationsLink"),
  mobileTrackLink: document.getElementById("mobileTrackLink"),

  email: document.getElementById("email"),
  password: document.getElementById("password"),
  signupBtn: document.getElementById("signup"),
  loginBtn: document.getElementById("login"),
  logoutBtn: document.getElementById("logout"),
  authBox: document.getElementById("authBox"),
  authMessageEl: document.getElementById("authMessage"),

  loginRequiredBox: document.getElementById("loginRequiredBox"),
  profileExistsBox: document.getElementById("profileExistsBox"),
  joinFormWrap: document.getElementById("joinFormWrap"),
  existingArtistPageLink: document.getElementById("existingArtistPageLink"),

  artistNameInput: document.getElementById("artistName"),
  bioInput: document.getElementById("bio"),
  nationalityInput: document.getElementById("nationality"),
  dateOfBirthInput: document.getElementById("dateOfBirth"),
  socialLinkInput: document.getElementById("socialLink"),
  photoFileInput: document.getElementById("photoFile"),
  wantsPromotionsInput: document.getElementById("wantsPromotions"),
  acceptedTermsInput: document.getElementById("acceptedTerms"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),
  statusEl: document.getElementById("status")
};

const state = {
  currentUser: null,
  currentProfileData: null,
  currentTrackData: null
};

function setHidden(el, hidden) {
  if (!el) return;
  el.classList.toggle("hidden", hidden);
}

function setAuthMessage(message, isError = false) {
  const safeMessage = message === "Auth session missing!" ? "" : (message || "");
  els.authMessageEl.textContent = safeMessage;
  els.authMessageEl.style.color = isError ? "#ff8a8a" : "#cfcfcf";
}

function setStatus(message, isError = false) {
  els.statusEl.textContent = message || "";
  els.statusEl.style.color = isError ? "#ff8a8a" : "#cfcfcf";
}

function setCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    if (els.currencyValue) els.currencyValue.textContent = "0";
    return;
  }

  if (els.currencyValue) {
    els.currencyValue.textContent = String(Math.max(0, Math.floor(amount)));
  }
}

function clearLoginFields() {
  els.email.value = "";
  els.password.value = "";
}

function populateCountries() {
  els.nationalityInput.innerHTML = '<option value="">Select your nationality</option>';

  for (const country of COUNTRY_OPTIONS) {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    els.nationalityInput.appendChild(option);
  }
}

function closeHeaderPanels() {
  setHidden(els.authBox, true);
  setHidden(els.accountMenu, true);
}

function getProfileHref(profile) {
  if (!profile) return "join.html";
  if (profile.user_id) {
    return `artist.html?user_id=${encodeURIComponent(profile.user_id)}`;
  }
  return "join.html";
}

function setHeaderAvatar(photoUrl, artistName) {
  if (photoUrl) {
    els.headerAvatarImage.src = photoUrl;
    setHidden(els.headerAvatarImage, false);
    setHidden(els.headerAvatarFallback, true);
    return;
  }

  setHidden(els.headerAvatarImage, true);
  setHidden(els.headerAvatarFallback, false);
  els.headerAvatarFallback.textContent = (artistName || "A").charAt(0).toUpperCase();
}

function fillProfileForm(profile) {
  els.artistNameInput.value = profile?.artist_name || "";
  els.bioInput.value = profile?.bio || "";
  els.nationalityInput.value = profile?.nationality || "";
  els.dateOfBirthInput.value = profile?.date_of_birth || "";
  els.socialLinkInput.value = profile?.social_link || "";
  els.wantsPromotionsInput.checked = Boolean(profile?.wants_promotions);
  els.acceptedTermsInput.checked = Boolean(profile?.accepted_terms);
}

function applyMenuState(user, profile, track) {
  const isLoggedIn = Boolean(user);
  const hasProfile = Boolean(profile);
  const hasTrack = Boolean(track);
  const profileHref = getProfileHref(profile);

  setHidden(els.desktopLoginLink, isLoggedIn);
  setHidden(els.mobileLoginLink, isLoggedIn);
  setHidden(els.desktopLogoutBtn, !isLoggedIn);

  setHidden(els.desktopProfileLink, !isLoggedIn);
  setHidden(els.mobileProfileLink, !isLoggedIn);

  setHidden(els.desktopNotificationsLink, !isLoggedIn);
  setHidden(els.mobileNotificationsLink, !isLoggedIn);

  setHidden(els.desktopTrackLink, !isLoggedIn || !hasProfile);
  setHidden(els.mobileTrackLink, !isLoggedIn || !hasProfile);

  if (els.desktopProfileLink) els.desktopProfileLink.href = profileHref;
  if (els.mobileProfileLink) els.mobileProfileLink.href = profileHref;
  if (els.accountProfileLink) els.accountProfileLink.href = profileHref;
  if (els.existingArtistPageLink) els.existingArtistPageLink.href = profileHref;

  setHidden(els.accountProfileLink, !isLoggedIn);

  if (els.desktopTrackLink) {
    els.desktopTrackLink.setAttribute("data-track-mode", hasTrack ? "edit" : "submit");
  }

  if (els.mobileTrackLink) {
    els.mobileTrackLink.setAttribute("data-track-mode", hasTrack ? "edit" : "submit");
  }
}

function setLoggedOutView() {
  state.currentUser = null;
  state.currentProfileData = null;
  state.currentTrackData = null;

  closeHeaderPanels();

  setHidden(els.showLoginBtn, false);
  setHidden(els.headerAvatarBtn, true);
  setHidden(els.headerAvatarImage, true);
  setHidden(els.headerAvatarFallback, true);
  setHidden(els.currencyBadge, true);
  setCurrency(0);

  if (els.headerAvatarImage) {
    els.headerAvatarImage.src = "";
  }

  setHidden(els.loginRequiredBox, false);
  setHidden(els.profileExistsBox, true);
  setHidden(els.joinFormWrap, true);

  applyMenuState(null, null, null);
}

function setLoggedInView() {
  setHidden(els.authBox, true);
  setHidden(els.showLoginBtn, true);
  setHidden(els.headerAvatarBtn, false);
  setHidden(els.currencyBadge, false);
}

function renderPageState() {
  const user = state.currentUser;
  const profile = state.currentProfileData;
  const track = state.currentTrackData;

  applyMenuState(user, profile, track);

  if (!user) {
    setLoggedOutView();
    fillProfileForm(null);
    return;
  }

  setLoggedInView();

  if (profile) {
    setHidden(els.loginRequiredBox, true);
    setHidden(els.profileExistsBox, false);
    setHidden(els.joinFormWrap, true);
    fillProfileForm(profile);
    return;
  }

  setHidden(els.loginRequiredBox, true);
  setHidden(els.profileExistsBox, true);
  setHidden(els.joinFormWrap, false);
  fillProfileForm(null);
}

async function getSessionUser() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) return null;
  return data?.session?.user || null;
}

async function loadMyProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("user_id, artist_name, photo_url, bio, nationality, date_of_birth, social_link, wants_promotions, accepted_terms, coins")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    state.currentProfileData = null;
    setHidden(els.currencyBadge, true);
    setCurrency(0);
    setHeaderAvatar("", "A");
    return null;
  }

  state.currentProfileData = data;
  setCurrency(data.coins || 0);
  setHeaderAvatar(data.photo_url, data.artist_name);
  return data;
}

async function loadMyTrack(userId) {
  const { data, error } = await supabaseClient
    .from("tracks")
    .select("id, user_id, title, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    state.currentTrackData = null;
    return null;
  }

  state.currentTrackData = data;
  return data;
}

async function refreshPageState() {
  const user = await getSessionUser();
  state.currentUser = user;

  if (!user) {
    renderPageState();
    return;
  }

  await Promise.all([
    loadMyProfile(user.id),
    loadMyTrack(user.id)
  ]);

  renderPageState();
}

async function loginWithCredentials(emailValue, passwordValue) {
  if (!emailValue || !passwordValue) {
    setAuthMessage("Please enter email and password.", true);
    return { ok: false };
  }

  setAuthMessage("", false);

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: emailValue,
    password: passwordValue
  });

  if (error) {
    setAuthMessage(error.message, true);
    return { ok: false };
  }

  clearLoginFields();
  return { ok: true };
}

async function signupWithCredentials(emailValue, passwordValue) {
  if (!emailValue || !passwordValue) {
    setAuthMessage("Please enter email and password.", true);
    return { ok: false, hasSession: false };
  }

  if (passwordValue.length < 6) {
    setAuthMessage("Password must be at least 6 characters.", true);
    return { ok: false, hasSession: false };
  }

  setAuthMessage("", false);

  const emailRedirectTo = new URL("join.html", window.location.href).href;

  const { data, error } = await supabaseClient.auth.signUp({
    email: emailValue,
    password: passwordValue,
    options: { emailRedirectTo }
  });

  if (error) {
    setAuthMessage(error.message, true);
    return { ok: false, hasSession: false };
  }

  const hasSession = Boolean(data?.session);
  const hasUser = Boolean(data?.user);

  clearLoginFields();

  if (hasSession) {
    setAuthMessage("Account created. You are now logged in.", false);
    return { ok: true, hasSession: true };
  }

  if (hasUser) {
    setAuthMessage("Account created. Check your email for the confirmation link.", false);
    return { ok: true, hasSession: false };
  }

  setAuthMessage("Signup completed, but the auth response was incomplete. Please try logging in.", false);
  return { ok: true, hasSession: false };
}

async function handleLogin() {
  els.loginBtn.disabled = true;
  els.signupBtn.disabled = true;

  try {
    const result = await loginWithCredentials(
      els.email.value.trim(),
      els.password.value
    );

    if (!result.ok) return;

    setHidden(els.authBox, true);
    await refreshPageState();
  } catch (err) {
    console.error(err);
    setAuthMessage("Login failed. Try again.", true);
  } finally {
    els.loginBtn.disabled = false;
    els.signupBtn.disabled = false;
  }
}

async function handleSignup() {
  els.loginBtn.disabled = true;
  els.signupBtn.disabled = true;

  try {
    const result = await signupWithCredentials(
      els.email.value.trim(),
      els.password.value
    );

    if (!result.ok) return;

    if (result.hasSession) {
      setHidden(els.authBox, true);
      await refreshPageState();
    }
  } catch (err) {
    console.error(err);
    setAuthMessage("Sign up failed. Try again.", true);
  } finally {
    els.loginBtn.disabled = false;
    els.signupBtn.disabled = false;
  }
}

async function handleLogout() {
  els.logoutBtn.disabled = true;
  els.desktopLogoutBtn.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      setAuthMessage(error.message, true);
      return;
    }

    clearLoginFields();
    await refreshPageState();
  } catch (err) {
    console.error(err);
    setAuthMessage("Logout failed. Try again.", true);
  } finally {
    els.logoutBtn.disabled = false;
    els.desktopLogoutBtn.disabled = false;
  }
}

async function uploadPhotoIfNeeded(userId, photoFile) {
  if (!photoFile) return state.currentProfileData?.photo_url || "";

  const cleanName = photoFile.name.replace(/\s+/g, "-");
  const photoPath = `${userId}/${Date.now()}-${cleanName}`;

  const { error } = await supabaseClient
    .storage
    .from("artist-photos")
    .upload(photoPath, photoFile, {
      cacheControl: "3600",
      upsert: true
    });

  if (error) {
    throw new Error("Photo upload failed: " + error.message);
  }

  const { data } = supabaseClient
    .storage
    .from("artist-photos")
    .getPublicUrl(photoPath);

  return data.publicUrl;
}

async function saveProfileWithoutUpsert(profilePayload, userId) {
  const { data: existingProfile, error: existingProfileError } = await supabaseClient
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error("Could not check existing profile: " + existingProfileError.message);
  }

  if (existingProfile) {
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update(profilePayload)
      .eq("user_id", userId);

    if (updateError) {
      throw new Error("Saving profile failed: " + updateError.message);
    }

    return;
  }

  const { error: insertError } = await supabaseClient
    .from("profiles")
    .insert([profilePayload]);

  if (insertError) {
    throw new Error("Saving profile failed: " + insertError.message);
  }
}

async function handleCreateProfile() {
  const artistName = els.artistNameInput.value.trim();
  const bio = els.bioInput.value.trim();
  const nationality = els.nationalityInput.value.trim();
  const dateOfBirth = els.dateOfBirthInput.value;
  const socialLink = els.socialLinkInput.value.trim();
  const photoFile = els.photoFileInput.files[0];
  const wantsPromotions = els.wantsPromotionsInput.checked;
  const acceptedTerms = els.acceptedTermsInput.checked;

  if (!artistName) {
    setStatus("Please enter your artist name.", true);
    return;
  }

  if (!acceptedTerms) {
    setStatus("You need to accept the terms and conditions.", true);
    return;
  }

  els.saveProfileBtn.disabled = true;
  setStatus("Checking account...");

  try {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();

    if (userError) {
      setStatus("Could not check current user: " + userError.message, true);
      return;
    }

    if (!userData.user) {
      setStatus("You must be logged in before creating your profile.", true);
      return;
    }

    const userId = userData.user.id;

    const { data: alreadyExistingProfile, error: alreadyExistingProfileError } = await supabaseClient
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (alreadyExistingProfileError) {
      setStatus("Could not check existing profile: " + alreadyExistingProfileError.message, true);
      return;
    }

    if (alreadyExistingProfile) {
      setStatus("You already have an artist profile.", false);
      await refreshPageState();
      return;
    }

    const photoUrl = await uploadPhotoIfNeeded(userId, photoFile);

    setStatus("Saving artist profile...");

    const profilePayload = {
      user_id: userId,
      artist_name: artistName,
      bio: bio || null,
      nationality: nationality || null,
      date_of_birth: dateOfBirth || null,
      social_link: socialLink || null,
      photo_url: photoUrl || null,
      wants_promotions: wantsPromotions,
      accepted_terms: acceptedTerms
    };

    await saveProfileWithoutUpsert(profilePayload, userId);

    setStatus("Artist profile created successfully.");
    els.photoFileInput.value = "";
    window.location.href = `artist.html?user_id=${encodeURIComponent(userId)}`;
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Something went wrong while saving your profile.", true);
  } finally {
    els.saveProfileBtn.disabled = false;
  }
}

function bindHeaderEvents() {
  els.showLoginBtn.onclick = () => {
    setHidden(els.accountMenu, true);
    els.authBox.classList.toggle("hidden");
    setAuthMessage("");

    if (!els.authBox.classList.contains("hidden")) {
      setTimeout(() => els.email.focus(), 0);
    }
  };

  els.headerAvatarBtn.onclick = () => {
    setHidden(els.authBox, true);
    els.accountMenu.classList.toggle("hidden");
  };

  if (els.accountProfileLink) {
    els.accountProfileLink.onclick = () => {
      setHidden(els.accountMenu, true);
    };
  }

  if (els.accountNotificationsLink) {
    els.accountNotificationsLink.onclick = () => {
      setHidden(els.accountMenu, true);
    };
  }
}

function bindAuthEvents() {
  els.loginBtn.onclick = handleLogin;
  els.signupBtn.onclick = handleSignup;
  els.logoutBtn.onclick = handleLogout;
  els.desktopLogoutBtn.onclick = handleLogout;

  els.email.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });

  els.password.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });

  supabaseClient.auth.onAuthStateChange(() => {
    refreshPageState().catch(err => console.error(err));
  });
}

function bindPageEvents() {
  els.saveProfileBtn.onclick = handleCreateProfile;

  document.addEventListener("click", (e) => {
    const insideHeaderRight = e.target.closest(".header-right");
    const insideAuthBox = e.target.closest("#authBox");
    const isLoginButton = e.target.closest("#showLoginBtn");
    const isAvatarButton = e.target.closest("#headerAvatarBtn");

    if (!insideHeaderRight && !insideAuthBox && !isLoginButton && !isAvatarButton) {
      setHidden(els.authBox, true);
      setHidden(els.accountMenu, true);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setHidden(els.authBox, true);
      setHidden(els.accountMenu, true);
    }
  });
}

async function initPage() {
  populateCountries();
  setLoggedOutView();
  fillProfileForm(null);
  setStatus("");

  bindHeaderEvents();
  bindAuthEvents();
  bindPageEvents();

  await refreshPageState();
}

initPage().catch(err => {
  console.error("initPage error:", err);
  setStatus("The page could not be loaded correctly.", true);
});
