"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getProfileHref, hasCompletedArtistProfile, hasUnreadNotifications } from "@/lib/profile";

type NavIconProps = { icon: string; active?: boolean };

function NavIcon({ icon }: NavIconProps) {
  return (
    <span className="desktop-nav-icon" aria-hidden="true">
      <span className="nav-icon-mask" style={{ ["--icon-url" as string]: `url('/icons/${icon}')` }} />
    </span>
  );
}

function MobileNavIcon({ icon }: NavIconProps) {
  return (
    <span className="mobile-nav-icon" aria-hidden="true">
      <span className="nav-icon-mask" style={{ ["--icon-url" as string]: `url('/icons/${icon}')` }} />
    </span>
  );
}

export default function SiteChrome() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, track, coins, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = Boolean(user);
  const hasProfile = hasCompletedArtistProfile(profile);
  const profileHref = getProfileHref(profile);
  const trackHref = "/submit-track";
  const notificationsIcon = unread ? "notifications.png" : "nonotifications.png";

  useEffect(() => {
    setUnread(hasUnreadNotifications());
  }, [user]);

  // Ported from setStandardLoggedIn/OutState() in app.js — several page
  // stylesheets key off these body classes (badge visibility, spacing, ...).
  useEffect(() => {
    document.body.classList.toggle("is-authenticated", isLoggedIn);
    document.body.classList.toggle("is-logged-out", !isLoggedIn);
  }, [isLoggedIn]);

  useEffect(() => {
    document.body.classList.toggle("page-other", pathname !== "/");
  }, [pathname]);

  // Close the account menu on outside click / Escape — ported from
  // bindStandardHeaderEvents() in app.js
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!menuRef.current?.contains(target) && !target.closest("#headerAvatarBtn")) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const isMobileMenuMode = () =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

  const handleAvatarClick = () => {
    if (isMobileMenuMode()) {
      setMenuOpen((open) => !open);
      return;
    }
    router.push(profileHref);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    router.push("/");
  };

  const avatarUrl = (profile as { photo_url?: string } | null)?.photo_url || null;
  const avatarInitial = String((profile?.artist_name as string) || user?.email || "A").charAt(0).toUpperCase();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href));

  return (
    <>
      {/* Coins badge */}
      {isLoggedIn && (
        <div id="currencyBadge" className="currency-badge" aria-label="Seconds balance">
          <Image src="/coin.webp" alt="" width={28} height={28} className="currency-badge-icon" />
          <span id="currencyValue" className="currency-badge-value">
            {coins}
          </span>
          <Link href="/store" className="currency-store-btn" aria-label="Open Seconds store">
            <Image src="/icons/plus.png" alt="+" width={14} height={14} className="currency-plus-icon" />
          </Link>
        </div>
      )}

      {/* Desktop side nav */}
      <aside className="desktop-side-nav" aria-label="Desktop navigation">
        <div className="desktop-side-nav-panel">
          <nav className="desktop-side-links">
            <Link className={`desktop-nav-link${isActive("/") ? " active" : ""}`} href="/" aria-label="Radio">
              <NavIcon icon="radio.png" />
              <span className="desktop-nav-label">Radio</span>
            </Link>

            <Link
              className={`desktop-nav-link${!isLoggedIn ? " hidden" : ""}${isActive(profileHref) ? " active" : ""}`}
              href={profileHref}
              aria-label="Profile"
            >
              <NavIcon icon="profile.png" />
              <span className="desktop-nav-label">Profile</span>
            </Link>

            <Link
              className={`desktop-nav-link${!isLoggedIn ? " hidden" : ""}${isActive("/notifications") ? " active" : ""}`}
              href="/notifications"
              aria-label="Notifications"
            >
              <NavIcon icon={notificationsIcon} />
              <span className="desktop-nav-label">Notifications</span>
            </Link>

            <Link
              className={`desktop-nav-link${!isLoggedIn ? " hidden" : ""}${isActive("/liked") ? " active" : ""}`}
              href="/liked"
              aria-label="Liked"
            >
              <NavIcon icon="like.png" />
              <span className="desktop-nav-label">Liked</span>
            </Link>

            <Link
              className={`desktop-nav-link${!isLoggedIn || !hasProfile ? " hidden" : ""}${isActive("/statistics") ? " active" : ""}`}
              href="/statistics"
              aria-label="Statistics"
            >
              <NavIcon icon="stats.png" />
              <span className="desktop-nav-label">Statistics</span>
            </Link>

            <Link
              className={`desktop-nav-link${!isLoggedIn || !hasProfile ? " hidden" : ""}${isActive("/submit-track") ? " active" : ""}`}
              href={trackHref}
              aria-label="Tune"
              data-track-mode={track ? "edit" : "submit"}
            >
              <NavIcon icon="track.png" />
              <span className="desktop-nav-label">Tune</span>
            </Link>
          </nav>

          <div className="desktop-side-bottom">
            <Link className={`desktop-nav-link${isLoggedIn ? " hidden" : ""}`} href="/login" aria-label="Login">
              <NavIcon icon="login.png" />
              <span className="desktop-nav-label">Login</span>
            </Link>

            <button
              className={`desktop-nav-button${!isLoggedIn ? " hidden" : ""}`}
              type="button"
              aria-label="Logout"
              onClick={handleLogout}
            >
              <NavIcon icon="logout.png" />
              <span className="desktop-nav-label">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="mobile-bottom-nav-wrap">
        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          <Link className={`mobile-nav-link${isActive("/") ? " active" : ""}`} href="/" aria-label="Radio">
            <MobileNavIcon icon="radio.png" />
            <span className="mobile-nav-label">Radio</span>
          </Link>

          <Link
            className={`mobile-nav-link${!isLoggedIn ? " hidden" : ""}${isActive(profileHref) ? " active" : ""}`}
            href={profileHref}
            aria-label="Profile"
          >
            <MobileNavIcon icon="profile.png" />
            <span className="mobile-nav-label">Profile</span>
          </Link>

          <Link
            className={`mobile-nav-link${!isLoggedIn ? " hidden" : ""}${isActive("/notifications") ? " active" : ""}`}
            href="/notifications"
            aria-label="Notifications"
          >
            <MobileNavIcon icon={notificationsIcon} />
            <span className="mobile-nav-label">Notifications</span>
          </Link>

          <Link
            className={`mobile-nav-link${!isLoggedIn ? " hidden" : ""}${isActive("/liked") ? " active" : ""}`}
            href="/liked"
            aria-label="Liked"
          >
            <MobileNavIcon icon="like.png" />
            <span className="mobile-nav-label">Liked</span>
          </Link>

          <Link
            className={`mobile-nav-link${!isLoggedIn || !hasProfile ? " hidden" : ""}${isActive("/submit-track") ? " active" : ""}`}
            href={trackHref}
            aria-label="Tune"
          >
            <MobileNavIcon icon="track.png" />
            <span className="mobile-nav-label">Tune</span>
          </Link>

          <Link className={`mobile-nav-link${isLoggedIn ? " hidden" : ""}`} href="/login" aria-label="Login">
            <MobileNavIcon icon="login.png" />
            <span className="mobile-nav-label">Login</span>
          </Link>
        </nav>
      </div>

      {/* Header */}
      <div className="header-wrap">
        <header className="header-bar">
          <div className="header-left" />

          <div className="header-center">
            <Link href="/" className="header-logo-link" aria-label="60 Seconds FM home">
              <Image src="/logo.png" alt="60 Seconds FM" width={216} height={64} className="header-logo" priority />
            </Link>
          </div>

          <div className="header-right">
            {!isLoggedIn && (
              <Link id="showLoginBtn" className="header-icon-btn" href="/login" aria-label="Login">
                <span className="person-icon" aria-hidden="true" />
              </Link>
            )}

            {isLoggedIn && (
              <button
                id="headerAvatarBtn"
                className="header-avatar-btn"
                type="button"
                aria-label="Open account menu"
                onClick={handleAvatarClick}
              >
                {avatarUrl ? (
                  <Image id="headerAvatarImage" src={avatarUrl} alt="Profile photo" width={42} height={42} />
                ) : (
                  <div id="headerAvatarFallback" className="header-avatar-fallback">
                    {avatarInitial}
                  </div>
                )}
              </button>
            )}

            <div id="accountMenu" ref={menuRef} className={`account-menu${menuOpen ? "" : " hidden"}`}>
              <div className="account-menu-actions">
                <Link
                  id="accountProfileLink"
                  className="metal-btn account-menu-link"
                  href={profileHref}
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <button id="logout" className="metal-btn" type="button" onClick={handleLogout}>
                  <span className="icon">⎋</span>Logout
                </button>
              </div>
            </div>
          </div>
        </header>
      </div>
    </>
  );
}
