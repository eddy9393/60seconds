const { getSupabaseClient, buildStandardShellEls, applyStandardMenuState, fetchProfileByUserId, fetchTrackByUserId, getCurrentUserSafe, hasCompletedArtistProfile } = window.SSFMApp;
const supabaseClient = getSupabaseClient();

// Aligned to the live Vercel setup shown in the latest screenshot:
// - www.60seconds.fm is the production domain
// - 60seconds.fm redirects to www.60seconds.fm
const CANONICAL_SITE_URL = "https://www.60seconds.fm";
const CANONICAL_LOGIN_URL = `${CANONICAL_SITE_URL}/login.html`;
const CANONICAL_CONFIRM_URL = `${CANONICAL_SITE_URL}/confirm.html?next=edit-profile.html%3Fwelcome%3D1`;

const els = {
  form: {
    loginForm: document.getElementById("loginForm"),
    emailInput: document.getElementById("email"),
    passwordInput: document.getElementById("password"),
    loginButton: document.getElementById("loginButton"),
    googleAuthButton: document.getElementById("googleAuthButton"),
    feedback: document.getElementById("feedback"),
    authModeToggle: document.getElementById("authModeToggle"),
    authSecondaryText: document.getElementById("authSecondaryText"),
    authSubtitle: document.getElementById("authSubtitle"),
    authTitle: document.getElementById("loginTitle"),
    authKicker: document.getElementById("authKicker")
  },

  shell: buildStandardShellEls()
};

const state = {
  authMode: "login"
};

function scrubSensitiveUrlParams() {
  const url = new URL(window.location.href);
  let changed = false;

  if (url.searchParams.has("email")) {
    url.searchParams.delete("email");
    changed = true;
  }

  if (url.searchParams.has("password")) {
    url.searchParams.delete("password");
    changed = true;
  }

  if (changed || window.location.hash.includes("access_token") || window.location.hash.includes("error=")) {
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
  }
}

function setText(element, value) {
  if (!element) return;
  element.textContent = value ?? "";
}

function setFeedback(message = "", type = "") {
  setText(els.form.feedback, message);
  els.form.feedback.className = "auth-feedback";

  if (type) {
    els.form.feedback.classList.add(type);
  }
}

function setLoadingState(isLoading) {
  els.form.loginButton.disabled = isLoading;

  if (els.form.googleAuthButton) {
    els.form.googleAuthButton.disabled = isLoading;
    els.form.googleAuthButton.setAttribute("aria-busy", isLoading ? "true" : "false");
  }

  if (state.authMode === "signup") {
    els.form.loginButton.textContent = isLoading ? "Creating account..." : "Sign Up";
    return;
  }

  els.form.loginButton.textContent = isLoading ? "Signing in..." : "Login";
}

function ensureGoogleButtonBranding() {
  const button = els.form.googleAuthButton;
  if (!button) return;

  button.innerHTML = `
    <span class="google-auth-icon" aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;flex:0 0 20px;">
      <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v2.99h3.87c2.26-2.08 3.57-5.15 3.57-8.63Z"/>
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.87-2.99c-1.07.72-2.44 1.14-4.08 1.14-3.14 0-5.8-2.12-6.75-4.97H1.25v3.12A12 12 0 0 0 12 24Z"/>
        <path fill="#FBBC05" d="M5.25 14.28A7.18 7.18 0 0 1 4.87 12c0-.79.14-1.55.38-2.28V6.6H1.25A12 12 0 0 0 0 12c0 1.94.46 3.78 1.25 5.4l4-3.12Z"/>
        <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.82l3.45-3.45C17.95 1.14 15.23 0 12 0A12 12 0 0 0 1.25 6.6l4 3.12c.95-2.85 3.61-4.95 6.75-4.95Z"/>
      </svg>
    </span>
    <span class="google-auth-label">Inloggen met Google</span>
  `;

  button.style.display = "inline-flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.gap = "10px";
}

function renderAuthMode() {
  setFeedback("");

  if (state.authMode === "signup") {
    document.title = "Sign Up — 60 Seconds FM";
    setText(els.form.authKicker, "New Artist Access");
    setText(els.form.authTitle, "Sign Up");
    setText(
      els.form.authSubtitle,
      "Create your account to join 60 Seconds FM. After that, you can create your artist profile and submit your track."
    );
    setText(els.form.loginButton, "Sign Up");
    setText(els.form.authSecondaryText, "Already have an account?");
    setText(els.form.authModeToggle, "Back to login");

    if (els.form.googleAuthButton) {
      els.form.googleAuthButton.setAttribute("aria-label", "Sign up with Google");
      const label = els.form.googleAuthButton.querySelector(".google-auth-label");
      if (label) label.textContent = "Registreren met Google";
    }
    return;
  }

  document.title = "Login — 60 Seconds FM";
  setText(els.form.authKicker, "Member Access");
  setText(els.form.authTitle, "Login");
  setText(
    els.form.authSubtitle,
    "Sign in to manage your profile, upload your track, and access your 60 Seconds FM account."
  );
  setText(els.form.loginButton, "Login");
  setText(els.form.authSecondaryText, "No account yet?");
  setText(els.form.authModeToggle, "Sign up");

  if (els.form.googleAuthButton) {
    els.form.googleAuthButton.setAttribute("aria-label", "Login with Google");
    const label = els.form.googleAuthButton.querySelector(".google-auth-label");
    if (label) label.textContent = "Inloggen met Google";
  }
}

function getOAuthRedirectUrl() {
  return CANONICAL_LOGIN_URL;
}

async function handleGoogleAuth() {
  setFeedback("");
  setLoadingState(true);

  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthRedirectUrl(),
        queryParams: {
          prompt: "select_account"
        }
      }
    });

    if (error) {
      setFeedback(error.message || "Google login could not be started. Please try again.", "error");
      setLoadingState(false);
    }
  } catch (err) {
    console.error("google auth error:", err);
    setFeedback("Google login could not be started. Please try again.", "error");
    setLoadingState(false);
  }
}

function applyOAuthFeedbackFromUrl() {
  const url = new URL(window.location.href);
  const searchError = url.searchParams.get("error_description") || url.searchParams.get("error");
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  const hashParams = new URLSearchParams(hash);
  const hashError = hashParams.get("error_description") || hashParams.get("error");
  const errorMessage = searchError || hashError;

  if (!errorMessage) return;

  setFeedback(decodeURIComponent(errorMessage).replace(/\+/g, " "), "error");

  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  url.searchParams.delete("error_code");
  url.searchParams.delete("code");
  url.searchParams.delete("sb");
  if (url.searchParams.get("oauth") === "google") {
    url.searchParams.delete("oauth");
  }
  url.hash = "";
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
}

async function getPostLoginDestination(userId) {
  if (!userId) return "index.html";

  try {
    const profile = await fetchProfileByUserId(userId, "user_id, artist_name");
    return hasCompletedArtistProfile(profile) ? "index.html" : "edit-profile.html?welcome=1";
  } catch (err) {
    console.error("getPostLoginDestination error:", err);
    return "index.html";
  }
}

async function syncMenuVisibility() {
  try {
    const user = await getCurrentUserSafe();
    if (!user) {
      applyStandardMenuState(els.shell, null, null, null);
      return null;
    }
    const [profile, track] = await Promise.all([
      fetchProfileByUserId(user.id, "user_id, artist_name"),
      fetchTrackByUserId(user.id, "id, user_id")
    ]);
    applyStandardMenuState(els.shell, user, profile, track);
    return user;
  } catch (err) {
    console.error("syncMenuVisibility error:", err);
    applyStandardMenuState(els.shell, null, null, null);
    return null;
  }
}

async function redirectIfAlreadyLoggedIn() {
  try {
    const user = await syncMenuVisibility();

    if (user) {
      const nextUrl = await getPostLoginDestination(user.id);
      window.location.replace(nextUrl);
    }
  } catch (err) {
    console.error("redirectIfAlreadyLoggedIn error:", err);
  }
}

function handleAuthModeToggle() {
  state.authMode = state.authMode === "login" ? "signup" : "login";
  renderAuthMode();
  ensureGoogleButtonBranding();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  setFeedback("");

  const email = els.form.emailInput.value.trim();
  const password = els.form.passwordInput.value;

  if (!email || !password) {
    setFeedback("Please enter your email and password.", "error");
    return;
  }

  if (password.length < 6) {
    setFeedback("Password must be at least 6 characters.", "error");
    return;
  }

  setLoadingState(true);

  try {
    if (state.authMode === "signup") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: CANONICAL_CONFIRM_URL
        }
      });

      if (error) {
        setFeedback(error.message || "Sign up failed. Please try again.", "error");
        return;
      }

      const session = data?.session || null;

      if (session?.user) {
        setFeedback("Account created. Redirecting to profile setup...", "success");
        setTimeout(() => {
          window.location.href = "edit-profile.html?welcome=1";
        }, 500);
      } else {
        setFeedback("Account created. Check your email to confirm your sign up.", "success");
      }

      return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setFeedback(error.message || "Login failed. Please try again.", "error");
      return;
    }

    setFeedback("Login successful. Redirecting...", "success");

    const nextUrl = await getPostLoginDestination((await getCurrentUserSafe())?.id);

    setTimeout(() => {
      window.location.href = nextUrl;
    }, 500);
  } catch (err) {
    console.error("auth error:", err);
    setFeedback("Something went wrong. Please try again.", "error");
  } finally {
    setLoadingState(false);
  }
}

function bindEvents() {
  els.form.authModeToggle.addEventListener("click", handleAuthModeToggle);
  els.form.loginForm.addEventListener("submit", handleAuthSubmit);

  if (els.form.googleAuthButton) {
    els.form.googleAuthButton.addEventListener("click", handleGoogleAuth);
  }

  supabaseClient.auth.onAuthStateChange(() => {
    syncMenuVisibility().catch((err) => console.error(err));
  });
}

async function initPage() {
  scrubSensitiveUrlParams();
  ensureGoogleButtonBranding();
  renderAuthMode();
  applyOAuthFeedbackFromUrl();
  applyStandardMenuState(els.shell, null, null, null);
  bindEvents();
  await redirectIfAlreadyLoggedIn();
}

initPage().catch((err) => {
  console.error("initPage error:", err);
});
