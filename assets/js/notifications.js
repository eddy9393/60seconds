
const { getSupabaseClient, setStandardHeaderAvatar, applyStandardMenuState, setStandardLoggedOutState, setStandardLoggedInState, bindStandardHeaderEvents, fetchProfileByUserId, fetchTrackByUserId, getCurrentUserSafe, refreshNotificationIndicator } = window.SSFMApp;
const supabaseClient = getSupabaseClient();

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
  page: {
    loginRequired: document.getElementById("notificationsLoginRequired"),
    emptyState: document.getElementById("notificationsEmptyState"),
    list: document.getElementById("notificationsList")
  }
};

function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle("hidden", hidden);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatRelative(dateString) {
  if (!dateString) return "";
  const time = new Date(dateString).getTime();
  if (!Number.isFinite(time)) return "";
  const diffMinutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function iconForNotification(type) {
  if (type === "tune_liked") return "♥";
  if (type === "welcome_bonus") return "✦";
  if (type === "tune_uploaded") return "↑";
  if (type === "tune_approved") return "✓";
  return "•";
}

async function deleteNotification(id, userId) {
  const { error } = await supabaseClient
    .from("user_notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

function bindSwipeToDelete(card, onDelete) {
  let startX = 0;
  let currentX = 0;
  let swiped = false;

  card.addEventListener("touchstart", (event) => {
    startX = event.touches[0].clientX;
    currentX = startX;
  }, { passive: true });

  card.addEventListener("touchmove", (event) => {
    currentX = event.touches[0].clientX;
    const deltaX = currentX - startX;
    if (deltaX < -18) {
      swiped = true;
      card.classList.add("is-swiped");
    } else if (deltaX > 10) {
      swiped = false;
      card.classList.remove("is-swiped");
    }
  }, { passive: true });

  card.addEventListener("touchend", () => {
    const deltaX = currentX - startX;
    if (deltaX < -70) {
      card.classList.add("is-swiped");
      swiped = true;
    } else if (!swiped) {
      card.classList.remove("is-swiped");
    }
  });

  const deleteBtn = card.querySelector(".notification-delete-mobile");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", onDelete);
  }
}

function renderNotifications(rows, userId) {
  els.page.list.innerHTML = "";

  rows.forEach((row) => {
    const item = document.createElement("article");
    item.className = "notification-item";
    item.innerHTML = `
      <div class="notification-swipe-shell">
        <button class="notification-delete-mobile" type="button" aria-label="Delete notification">Delete</button>
        <div class="notification-card">
          <button class="notification-delete-desktop" type="button" aria-label="Delete notification">×</button>
          <div class="notification-icon">${iconForNotification(row.type)}</div>
          <div class="notification-body">
            <div class="notification-topline">
              <div class="notification-title">${escapeHtml(row.title || "Notification")}</div>
              <div class="notification-time">${escapeHtml(formatRelative(row.created_at))}</div>
            </div>
            <div class="notification-copy">${escapeHtml(row.body || "")}</div>
            ${Number(row.reward_seconds) > 0 ? `<div class="notification-reward">+${Number(row.reward_seconds)} Seconds</div>` : ""}
          </div>
        </div>
      </div>
    `;

    const handleDelete = async () => {
      try {
        await deleteNotification(row.id, userId);
        item.remove();
        if (!els.page.list.children.length) {
          setHidden(els.page.list, true);
          setHidden(els.page.emptyState, false);
        }
        await refreshNotificationIndicator(els, userId);
      } catch (error) {
        console.error("delete notification error:", error);
      }
    };

    item.querySelector(".notification-delete-desktop")?.addEventListener("click", handleDelete);
    bindSwipeToDelete(item, handleDelete);
    els.page.list.appendChild(item);
  });
}

async function loadPage() {
  const user = await getCurrentUserSafe();
  if (!user) {
    setStandardLoggedOutState(els);
    setHidden(els.page.loginRequired, false);
    setHidden(els.page.emptyState, true);
    setHidden(els.page.list, true);
    return;
  }

  const [profile, track] = await Promise.all([
    fetchProfileByUserId(user.id, "artist_name, photo_url, user_id, coins"),
    fetchTrackByUserId(user.id, "id, user_id, title, status")
  ]);

  setStandardLoggedInState(els, { coins: profile?.coins || 0 });
  applyStandardMenuState(els, user, profile, track, { hideAccountNotifications: true });
  setStandardHeaderAvatar(els, profile?.photo_url, profile?.artist_name || user.email || "A");

  const { data, error } = await supabaseClient
    .from("user_notifications")
    .select("id, type, title, body, reward_seconds, created_at, is_read")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) {
    setHidden(els.page.loginRequired, true);
    setHidden(els.page.emptyState, false);
    setHidden(els.page.list, true);
    await refreshNotificationIndicator(els, user.id);
    return;
  }

  renderNotifications(rows, user.id);
  setHidden(els.page.loginRequired, true);
  setHidden(els.page.emptyState, true);
  setHidden(els.page.list, false);

  await supabaseClient
    .from("user_notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  await refreshNotificationIndicator(els, user.id);
}

bindStandardHeaderEvents(els, {
  onLogout: async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  }
});

loadPage().catch((error) => {
  console.error("notifications page error:", error);
});
