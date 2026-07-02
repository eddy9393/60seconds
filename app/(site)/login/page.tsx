"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./login.css";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchProfileByUserId, hasCompletedArtistProfile } from "@/lib/profile";

// Aligned to the live Vercel setup: www.60seconds.fm is the production
// domain, so OAuth/email redirects always land back on production.
const CANONICAL_SITE_URL = "https://www.60seconds.fm";
const CANONICAL_LOGIN_URL = `${CANONICAL_SITE_URL}/login`;
const CANONICAL_CONFIRM_URL = `${CANONICAL_SITE_URL}/confirm?next=%2Fedit-profile%3Fwelcome%3D1`;

type AuthMode = "login" | "signup";
type Feedback = { message: string; type: "" | "error" | "success" };

async function getPostLoginDestination(userId?: string | null): Promise<string> {
  if (!userId) return "/";
  try {
    const profile = await fetchProfileByUserId(userId, "user_id, artist_name");
    return hasCompletedArtistProfile(profile) ? "/" : "/edit-profile?welcome=1";
  } catch (err) {
    console.error("getPostLoginDestination error:", err);
    return "/";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<Feedback>({ message: "", type: "" });
  const [busy, setBusy] = useState(false);

  // Scrub sensitive params / surface OAuth errors from the URL, ported from
  // scrubSensitiveUrlParams() + applyOAuthFeedbackFromUrl() in login.js
  useEffect(() => {
    const url = new URL(window.location.href);
    const searchError = url.searchParams.get("error_description") || url.searchParams.get("error");
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const hashParams = new URLSearchParams(hash);
    const hashError = hashParams.get("error_description") || hashParams.get("error");
    const errorMessage = searchError || hashError;

    if (errorMessage) {
      setFeedback({ message: decodeURIComponent(errorMessage).replace(/\+/g, " "), type: "error" });
    }

    if (url.searchParams.has("email") || url.searchParams.has("password") || errorMessage || hash.includes("access_token")) {
      url.searchParams.delete("email");
      url.searchParams.delete("password");
      url.searchParams.delete("error");
      url.searchParams.delete("error_description");
      url.searchParams.delete("error_code");
      url.searchParams.delete("code");
      url.searchParams.delete("sb");
      url.hash = "";
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
    }
  }, []);

  // Ported from redirectIfAlreadyLoggedIn() in login.js
  useEffect(() => {
    if (loading || !user) return;
    getPostLoginDestination(user.id).then((next) => router.replace(next));
  }, [loading, user, router]);

  useEffect(() => {
    document.title = mode === "signup" ? "Sign Up — 60 Seconds FM" : "Login — 60 Seconds FM";
  }, [mode]);

  const handleGoogleAuth = async () => {
    setFeedback({ message: "", type: "" });
    setBusy(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: CANONICAL_LOGIN_URL, queryParams: { prompt: "select_account" } },
      });
      if (error) {
        setFeedback({ message: error.message || "Google login could not be started. Please try again.", type: "error" });
        setBusy(false);
      }
    } catch (err) {
      console.error("google auth error:", err);
      setFeedback({ message: "Google login could not be started. Please try again.", type: "error" });
      setBusy(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback({ message: "", type: "" });

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setFeedback({ message: "Please enter your email and password.", type: "error" });
      return;
    }
    if (password.length < 6) {
      setFeedback({ message: "Password must be at least 6 characters.", type: "error" });
      return;
    }

    setBusy(true);
    const supabase = getSupabaseClient();

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { emailRedirectTo: CANONICAL_CONFIRM_URL },
        });

        if (error) {
          setFeedback({ message: error.message || "Sign up failed. Please try again.", type: "error" });
          return;
        }

        if (data?.session?.user) {
          setFeedback({ message: "Account created. Redirecting to profile setup...", type: "success" });
          setTimeout(() => router.push("/edit-profile?welcome=1"), 500);
        } else {
          setFeedback({ message: "Account created. Check your email to confirm your sign up.", type: "success" });
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      if (error) {
        setFeedback({ message: error.message || "Login failed. Please try again.", type: "error" });
        return;
      }

      setFeedback({ message: "Login successful. Redirecting...", type: "success" });
      const {
        data: { user: freshUser },
      } = await supabase.auth.getUser();
      const nextUrl = await getPostLoginDestination(freshUser?.id);
      setTimeout(() => router.push(nextUrl), 500);
    } catch (err) {
      console.error("auth error:", err);
      setFeedback({ message: "Something went wrong. Please try again.", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="loginTitle">
        <div className="auth-kicker">{isSignup ? "New Artist Access" : "Member Access"}</div>
        <h1 id="loginTitle" className="auth-title">
          {isSignup ? "Sign Up" : "Login"}
        </h1>
        <p className="auth-subtitle">
          {isSignup
            ? "Create your account to join 60 Seconds FM. After that, you can create your artist profile and submit your track."
            : "Sign in to manage your profile, upload your tune, and access your 60 Seconds FM account."}
        </p>

        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              className="field-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              className="field-input"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className={`auth-feedback${feedback.type ? ` ${feedback.type}` : ""}`} aria-live="polite">
            {feedback.message}
          </div>

          <button id="loginButton" className="auth-button" type="submit" disabled={busy}>
            {busy ? (isSignup ? "Creating account..." : "Signing in...") : isSignup ? "Sign Up" : "Login"}
          </button>
        </form>

        <div className="auth-social-divider" aria-hidden="true">
          <span>or continue with</span>
        </div>

        <div className="auth-social-grid" aria-label="Social login options">
          <button
            id="googleAuthButton"
            className="auth-social-button"
            type="button"
            disabled={busy}
            aria-label={isSignup ? "Sign up with Google" : "Login with Google"}
            onClick={handleGoogleAuth}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10 }}
          >
            <span
              className="auth-social-icon"
              aria-hidden="true"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, flex: "0 0 20px" }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v2.99h3.87c2.26-2.08 3.57-5.15 3.57-8.63Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.87-2.99c-1.07.72-2.44 1.14-4.08 1.14-3.14 0-5.8-2.12-6.75-4.97H1.25v3.12A12 12 0 0 0 12 24Z" />
                <path fill="#FBBC05" d="M5.25 14.28A7.18 7.18 0 0 1 4.87 12c0-.79.14-1.55.38-2.28V6.6H1.25A12 12 0 0 0 0 12c0 1.94.46 3.78 1.25 5.4l4-3.12Z" />
                <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.82l3.45-3.45C17.95 1.14 15.23 0 12 0A12 12 0 0 0 1.25 6.6l4 3.12c.95-2.85 3.61-4.95 6.75-4.95Z" />
              </svg>
            </span>
            <span className="google-auth-label">{isSignup ? "Registreren met Google" : "Inloggen met Google"}</span>
          </button>
        </div>

        <div className="auth-links">
          <div className="auth-secondary">{isSignup ? "Already have an account?" : "No account yet?"}</div>
          <button
            className="auth-link"
            type="button"
            onClick={() => {
              setMode((m) => (m === "login" ? "signup" : "login"));
              setFeedback({ message: "", type: "" });
            }}
          >
            {isSignup ? "Back to login" : "Sign up"}
          </button>
          <Link className="auth-link" href="/">
            Back to Radio
          </Link>
        </div>
      </section>
    </main>
  );
}
