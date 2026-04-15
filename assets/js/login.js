const { getSupabaseClient, buildStandardShellEls, applyStandardMenuState, fetchProfileByUserId, fetchTrackByUserId, getCurrentUserSafe } = window.SSFMApp;
const supabaseClient = getSupabaseClient();

const els = {
  form: {
    loginForm: document.getElementById("loginForm"),
    emailInput: document.getElementById("email"),
    passwordInput: document.getElementById("password"),
    loginButton: document.getElementById("loginButton"),
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
  if (url.searchParams.has('email')) { url.searchParams.delete('email'); changed = true; }
  if (url.searchParams.has('password')) { url.searchParams.delete('password'); changed = true; }
  if (changed || window.location.hash.includes('access_token') || window.location.hash.includes('error=')) {
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
  }
}


function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle("hidden", hidden);
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

  if (state.authMode === "signup") {
    els.form.loginButton.textContent = isLoading ? "Creating account..." : "Sign Up";
    return;
  }

  els.form.loginButton.textContent = isLoading ? "Signing in..." : "Login";
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
}

async function syncMenuVisibility() {
  try {
    const user = await getCurrentUserSafe();
    if (!user) {
      applyStandardMenuState(els.shell, null, null, null);
      return null;
    }
    const [profile, track] = await Promise.all([
      fetchProfileByUserId(user.id, 'user_id, artist_name'),
      fetchTrackByUserId(user.id, 'id, user_id')
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
      window.location.href = "index.html";
    }
  } catch (err) {
    console.error("redirectIfAlreadyLoggedIn error:", err);
  }
}

function handleAuthModeToggle() {
  state.authMode = state.authMode === "login" ? "signup" : "login";
  renderAuthMode();
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
          emailRedirectTo: "https://www.60seconds.fm/confirm.html?next=join.html"
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
          window.location.href = "join.html";
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

    setTimeout(() => {
      window.location.href = "index.html";
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

  supabaseClient.auth.onAuthStateChange(() => {
    syncMenuVisibility().catch((err) => console.error(err));
  });
}

async function initPage() {
  scrubSensitiveUrlParams();
  renderAuthMode();
  applyStandardMenuState(els.shell, null, null, null);
  bindEvents();
  await redirectIfAlreadyLoggedIn();
}

initPage().catch((err) => {
  console.error("initPage error:", err);
});
