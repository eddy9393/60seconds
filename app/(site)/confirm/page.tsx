"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../login/login.css";
import { getSupabaseClient } from "@/lib/supabase";

export default function ConfirmPage() {
  const router = useRouter();
  const [subtitle, setSubtitle] = useState("Please wait while we verify your email link.");
  const [feedback, setFeedback] = useState<{ message: string; type: "" | "error" | "success" }>({
    message: "",
    type: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const url = new URL(window.location.href);
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type") || "signup";
      const next = url.searchParams.get("next") || "/edit-profile?welcome=1";

      if (tokenHash) {
        const supabase = getSupabaseClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.auth.verifyOtp({ type: type as any, token_hash: tokenHash });
        if (cancelled) return;

        if (error) {
          console.error("verifyOtp error:", error);
          setSubtitle("This activation link is invalid or expired.");
          setFeedback({ message: error.message || "This activation link is invalid or expired.", type: "error" });
          return;
        }

        setSubtitle("Your account is confirmed. Redirecting...");
        setFeedback({ message: "Account confirmed successfully. Redirecting...", type: "success" });
        window.history.replaceState({}, document.title, "/confirm");
        setTimeout(() => router.push(next), 800);
        return;
      }

      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const hashParams = new URLSearchParams(hash);
      if (hashParams.get("error")) {
        setSubtitle("This activation link is invalid or expired.");
        setFeedback({
          message: hashParams.get("error_description") || "This activation link is invalid or expired.",
          type: "error",
        });
        window.history.replaceState({}, document.title, "/confirm");
        return;
      }

      setSubtitle("No activation token was found.");
      setFeedback({ message: "No activation token was found in this link.", type: "error" });
    }

    run().catch((err) => {
      console.error("confirm init error:", err);
      setFeedback({ message: "Something went wrong while confirming your account.", type: "error" });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="confirmTitle">
        <div className="auth-kicker">Account Activation</div>
        <h1 id="confirmTitle" className="auth-title">
          Confirming your account
        </h1>
        <p className="auth-subtitle">{subtitle}</p>
        <div className={`auth-feedback${feedback.type ? ` ${feedback.type}` : ""}`} aria-live="polite">
          {feedback.message}
        </div>
        <div className="auth-links">
          <Link className="auth-link" href="/login">
            Back to Login
          </Link>
          <Link className="auth-link" href="/">
            Back to Radio
          </Link>
        </div>
      </section>
    </main>
  );
}
