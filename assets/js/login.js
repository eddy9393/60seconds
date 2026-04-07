const supabaseClient = window.supabase.createClient(
  "https://rgoutegbcpjytplqcwze.supabase.co",
  "sb_publishable_255qyDKS77nMU0pbedfa_A_3hdgtEHh"
);

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

  desktopNav: {
    profileLink: document.getElementById("desktopProfileLink"),
    notificationsLink: document.getElementById("desktopNotificationsLink"),
    trackLink: document.getElementById("desktopTrackLink")
  },

  mobileNav: {
    profileLink: document.getElementById("mobileProfileLink"),
    notificationsLink: document.getElementById("mobileNotificationsLink"),
    trackLink: document.getElementById("mobileTrackLink")
  }
};

const state = {
  authMode: "login"
};

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

function setLoggedOutMenu() {
  setHidden(els.desktopNav.profileLink, true);
  setHidden(els.desktopNav.notificationsLink, true);
  setHidden(els.desktopNav.trackLink, true);

  setHidden(els.mobileNav.profileLink, true);
  setHidden(els.mobileNav.notificationsLink, true);
  setHidden(els.mobileNav.trackLink, true);
}

function setLoggedInMenu() {
  setHidden(els.desktopNav.profileLink, false);
  setHidden(els.desktopNav.notificationsLink, false);
  setHidden(els.desktopNav.trackLink, false);

  setHidden(els.mobileNav.profileLink, false);
  setHidden(els.mobileNav.notificationsLink, false);
  setHidden(els.mobileNav.trackLink, false);
}

async function syncMenuVisibility() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      setLoggedOutMenu();
      return null;
    }

    const user = data?.session?.user || null;

    if (user) {
      setLoggedInMenu();
      return user;
    }

    setLoggedOutMenu();
    return null;
  } catch (err) {
    console.error("syncMenuVisibility error:", err);
    setLoggedOutMenu();
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
        password
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
  renderAuthMode();
  setLoggedOutMenu();
  bindEvents();
  await redirectIfAlreadyLoggedIn();
}

initPage().catch((err) => {
  console.error("initPage error:", err);
});
