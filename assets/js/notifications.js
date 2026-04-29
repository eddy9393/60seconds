const { getSupabaseClient, getProfileHref: sharedGetProfileHref, bindRuntimeCurrencySync, applyRuntimeCurrencySnapshotToElement, closeStandardHeaderPanels, setStandardHeaderAvatar, handleStandardHeaderAvatarAction, applyStandardMenuState, setStandardLoggedOutState, setStandardLoggedInState, bindStandardHeaderEvents, fetchProfileByUserId, fetchTrackByUserId, getCurrentUserSafe, setUnreadNotificationsFlag, syncUnreadNotificationsFlagForUser } = window.SSFMApp;
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
    wrap: document.querySelector('.page-wrap'),
    emptyCard: document.querySelector('.empty-card'),
    emptyTitle: document.querySelector('.empty-title'),
    emptyText: document.querySelector('.empty-text')
  }
};

const state = {
  currentProfileData: null,
  currentTrackData: null,
  notifications: [],
  deletingIds: new Set(),
  profilesByUserId: new Map(),
  tracksById: new Map(),
  realtimeChannel: null
};

function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle("hidden", hidden);
}

function closeHeaderPanels() {
  closeStandardHeaderPanels(els);
}

function setCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    if (els.header.currencyValue) els.header.currencyValue.textContent = "0";
    return;
  }

  if (els.header.currencyValue) {
    els.header.currencyValue.textContent = String(Math.max(0, Math.floor(amount)));
  }
}

function applyRuntimeCurrencySnapshot() {
  applyRuntimeCurrencySnapshotToElement(els.header?.currencyValue, els.header?.currencyBadge);
}

bindRuntimeCurrencySync(els.header?.currencyValue, els.header?.currencyBadge);

function getProfileHref(profile) {
  return sharedGetProfileHref(profile);
}

function handleHeaderAvatarAction(profileHref) {
  handleStandardHeaderAvatarAction(els, profileHref);
}

function applyMenuState(user, profile, track) {
  applyStandardMenuState(els, user, profile, track, { hideAccountNotifications: true });
}

function setLoggedOutView() {
  setStandardLoggedOutState(els);
  state.currentProfileData = null;
  state.currentTrackData = null;
  state.notifications = [];
  applyMenuState(null, null, null);
}

function setLoggedInView() {
  setStandardLoggedInState(els, { coins: state.currentProfileData?.coins || 0 });
}

function setHeaderAvatar(photoUrl, artistName) {
  setStandardHeaderAvatar(els, photoUrl, artistName);
}

async function loadMyProfile(userId) {
  const data = await fetchProfileByUserId(userId, "artist_name, photo_url, user_id, coins");

  if (!data) {
    state.currentProfileData = null;
    setHeaderAvatar("", "•");
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
    .select("id, user_id, title, status, created_at, updated_at")
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

async function refreshAuthUI() {
  try {
    const user = await getCurrentUserSafe();

    if (user) {
      setLoggedInView();

      const profile = await loadMyProfile(user.id);
      const track = await loadMyTrack(user.id);

      applyMenuState(user, profile, track);
      return user;
    }

    setLoggedOutView();
    return null;
  } catch (err) {
    console.error("refreshAuthUI error:", err);
    setLoggedOutView();
    return null;
  }
}

function getNotificationListHost() {
  let host = document.getElementById('notificationsList');
  if (host) return host;

  host = document.createElement('section');
  host.id = 'notificationsList';
  host.className = 'notifications-list';
  if (els.page.emptyCard?.parentNode) {
    els.page.emptyCard.parentNode.insertBefore(host, els.page.emptyCard);
  } else if (els.page.wrap) {
    els.page.wrap.appendChild(host);
  }
  return host;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNotificationDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getNotificationEmoji(type) {
  switch (String(type || '').trim()) {
    case 'welcome_bonus':
      return '🎉';
    case 'tune_uploaded':
      return '📤';
    case 'tune_approved':
      return '✅';
    case 'tune_liked':
      return '❤️';
    default:
      return '🔔';
  }
}


function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function getNotificationGroupIds(item) {
  const ids = Array.isArray(item?._groupIds) ? item._groupIds.filter(Boolean) : [];
  return ids.length ? ids : [item?.id].filter(Boolean);
}

function getNotificationDeleteValue(item) {
  return getNotificationGroupIds(item).join(',');
}

function dedupeNotifications(items) {
  const map = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    if (!item) return;
    const isLike = String(item.type || '').trim() === 'tune_liked';
    const key = isLike
      ? `tune_liked:${String(item.related_track_id || '')}:${String(item.related_user_id || '')}`
      : `id:${String(item.id || '')}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...item, _groupIds: [item.id].filter(Boolean) });
      return;
    }

    const existingTime = new Date(existing.created_at || 0).getTime() || 0;
    const nextTime = new Date(item.created_at || 0).getTime() || 0;
    const unread = existing.is_read === false || item.is_read === false;
    const mergedIds = [...new Set([...(existing._groupIds || []), item.id].filter(Boolean))];
    const preferred = nextTime >= existingTime ? { ...existing, ...item } : { ...item, ...existing };
    map.set(key, { ...preferred, is_read: !unread ? true : false, _groupIds: mergedIds });
  });
  return Array.from(map.values()).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

async function enrichNotifications(items) {
  const notifications = Array.isArray(items) ? items : [];
  const userIds = [...new Set(notifications.map((item) => String(item.related_user_id || '').trim()).filter(Boolean))];
  const trackIds = [...new Set(notifications.map((item) => String(item.related_track_id || '').trim()).filter(Boolean))];

  const missingUserIds = userIds.filter((id) => !state.profilesByUserId.has(id));
  const missingTrackIds = trackIds.filter((id) => !state.tracksById.has(id));

  if (missingUserIds.length) {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('user_id, artist_name, photo_url')
      .in('user_id', missingUserIds);
    if (!error && Array.isArray(data)) {
      data.forEach((row) => state.profilesByUserId.set(String(row.user_id), row));
    }
  }

  if (missingTrackIds.length) {
    const { data, error } = await supabaseClient
      .from('tracks')
      .select('id, title')
      .in('id', missingTrackIds);
    if (!error && Array.isArray(data)) {
      data.forEach((row) => state.tracksById.set(String(row.id), row));
    }
  }

  return notifications.map((item) => {
    const relatedUserId = String(item.related_user_id || '').trim();
    const relatedTrackId = String(item.related_track_id || '').trim();
    return {
      ...item,
      relatedProfile: relatedUserId ? state.profilesByUserId.get(relatedUserId) || null : null,
      relatedTrack: relatedTrackId ? state.tracksById.get(relatedTrackId) || null : null
    };
  });
}

function getNotificationAvatarMarkup(item) {
  if (String(item?.type || '').trim() !== 'tune_liked') {
    return `<div class="notification-icon" aria-hidden="true">${getNotificationEmoji(item?.type)}</div>`;
  }

  const profile = item?.relatedProfile || null;
  const profileName = String(profile?.artist_name || item?.related_user_id || 'A').trim() || 'A';
  const initial = escapeHtml(profileName.charAt(0).toUpperCase());
  const profileHref = profile?.user_id ? `artist.html?user_id=${encodeURIComponent(profile.user_id)}` : '#';

  if (profile?.photo_url) {
    return `<a class="notification-avatar-link" href="${escapeAttribute(profileHref)}" aria-label="Open artist profile of ${escapeAttribute(profileName)}"><img class="notification-avatar" src="${escapeAttribute(profile.photo_url)}" alt="${escapeAttribute(profileName)}" /></a>`;
  }

  return `<a class="notification-avatar-link" href="${escapeAttribute(profileHref)}" aria-label="Open artist profile of ${escapeAttribute(profileName)}"><span class="notification-avatar-fallback">${initial}</span></a>`;
}

function getNotificationTitle(item) {
  if (String(item?.type || '').trim() === 'tune_liked') return 'Your Tune got a new like';
  return String(item?.title || 'Notification');
}

function getNotificationBodyMarkup(item) {
  if (String(item?.type || '').trim() === 'tune_liked') {
    const trackTitle = String(item?.relatedTrack?.title || 'Your tune').trim() || 'Your tune';
    const profile = item?.relatedProfile || null;
    const displayName = String(profile?.artist_name || item?.related_user_id || 'Someone').trim() || 'Someone';
    const profileHref = profile?.user_id ? `artist.html?user_id=${encodeURIComponent(profile.user_id)}` : '#';
    return `<span class="notification-track-name">${escapeHtml(trackTitle)}</span> just got some love from <a class="notification-user-link" href="${escapeAttribute(profileHref)}">${escapeHtml(displayName)}</a>`;
  }
  return escapeHtml(item?.body || '');
}

function renderNotifications(items) {
  const host = getNotificationListHost();
  if (!host) return;

  if (!Array.isArray(items) || items.length === 0) {
    host.innerHTML = '';
    setHidden(host, true);
    if (els.page.emptyTitle) els.page.emptyTitle.textContent = 'No notifications yet';
    if (els.page.emptyText) els.page.emptyText.textContent = "When something happens, you'll see it here.";
    setHidden(els.page.emptyCard, false);
    return;
  }

  setHidden(els.page.emptyCard, true);
  setHidden(host, false);
  host.innerHTML = items.map((item) => {
    const reward = Number(item.reward_seconds || 0);
    const rewardMarkup = reward > 0
      ? `<div class="notification-reward">+${reward} Seconds</div>`
      : '';

    return `
      <article class="notification-card${item.is_read ? '' : ' unread'}" data-notification-id="${escapeHtml(item.id || '')}">
        <button class="notification-delete-btn" type="button" aria-label="Delete notification" data-delete-id="${escapeAttribute(getNotificationDeleteValue(item))}">×</button>
        <div class="notification-swipe-hint" aria-hidden="true">Delete</div>
        ${getNotificationAvatarMarkup(item)}
        <div class="notification-content">
          <div class="notification-topline">
            <h2 class="notification-title">${escapeHtml(getNotificationTitle(item))}</h2>
            <time class="notification-time" datetime="${escapeHtml(item.created_at || '')}">${escapeHtml(formatNotificationDate(item.created_at))}</time>
          </div>
          <p class="notification-body">${getNotificationBodyMarkup(item)}</p>
          ${rewardMarkup}
        </div>
      </article>
    `;
  }).join('');

  bindNotificationInteractions();
}


function isTouchViewport() {
  return window.matchMedia('(max-width: 768px)').matches;
}

async function deleteNotification(notificationId) {
  const notificationIds = String(notificationId || '').split(',').map((value) => value.trim()).filter(Boolean);
  const deleteKey = notificationIds.join(',');
  if (!notificationIds.length || state.deletingIds.has(deleteKey)) return;
  const user = await getCurrentUserSafe();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  state.deletingIds.add(deleteKey);
  const primaryId = notificationIds[0];
  const card = document.querySelector(`.notification-card[data-notification-id="${CSS.escape(primaryId)}"]`);
  if (card) card.classList.add('is-deleting');

  try {
    const { error } = await supabaseClient
      .from('user_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;

    state.notifications = state.notifications.filter((item) => !getNotificationGroupIds(item).some((id) => notificationIds.includes(id)));
    renderNotifications(state.notifications);
    await syncUnreadNotificationsFlagForUser(user.id);
  } catch (err) {
    console.error('deleteNotification error:', err);
    if (card) card.classList.remove('is-deleting', 'swipe-delete-ready');
    await syncUnreadNotificationsFlagForUser(user.id);
  } finally {
    state.deletingIds.delete(deleteKey);
  }
}

function bindNotificationInteractions() {
  const host = getNotificationListHost();
  if (!host) return;

  host.querySelectorAll('[data-delete-id]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await deleteNotification(button.dataset.deleteId);
    });
  });

  host.querySelectorAll('.notification-card').forEach((card) => {
    let startX = 0;
    let currentX = 0;
    let dragging = false;

    const reset = () => {
      dragging = false;
      currentX = 0;
      card.style.removeProperty('--swipe-x');
      card.classList.remove('is-swiping', 'swipe-delete-ready');
    };

    const begin = (clientX) => {
      if (!isTouchViewport()) return;
      startX = clientX;
      currentX = 0;
      dragging = true;
      card.classList.add('is-swiping');
    };

    const move = (clientX) => {
      if (!dragging) return;
      const delta = clientX - startX;
      currentX = Math.min(0, delta);
      card.style.setProperty('--swipe-x', `${Math.max(-120, currentX)}px`);
      card.classList.toggle('swipe-delete-ready', currentX <= -72);
    };

    const end = async () => {
      if (!dragging) return;
      const shouldDelete = currentX <= -72;
      const notificationId = card.dataset.notificationId;
      reset();
      if (shouldDelete && notificationId) await deleteNotification(notificationId);
    };

    card.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) return;
      begin(event.touches[0].clientX);
    }, { passive: true });

    card.addEventListener('touchmove', (event) => {
      if (event.touches.length !== 1) return;
      move(event.touches[0].clientX);
    }, { passive: true });

    card.addEventListener('touchend', () => {
      end().catch((err) => console.error(err));
    });

    card.addEventListener('touchcancel', reset);
  });
}

async function fetchNotifications(userId) {
  const { data, error } = await supabaseClient
    .from('user_notifications')
    .select('id, type, title, body, reward_seconds, related_track_id, related_user_id, created_at, is_read')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  const deduped = dedupeNotifications(Array.isArray(data) ? data : []);
  state.notifications = await enrichNotifications(deduped);
  return state.notifications;
}

async function acknowledgeNotifications(notifications, userId) {
  if (!userId) return false;
  const unreadIds = Array.isArray(notifications)
    ? notifications
        .filter((item) => item && item.is_read === false)
        .flatMap((item) => getNotificationGroupIds(item))
        .filter(Boolean)
    : [];

  try {
    if (unreadIds.length > 0) {
      const { error } = await supabaseClient
        .from('user_notifications')
        .update({ is_read: true })
        .in('id', unreadIds)
        .eq('user_id', userId);

      if (error) throw error;

      state.notifications = state.notifications.map((item) => getNotificationGroupIds(item).some((id) => unreadIds.includes(id)) ? { ...item, is_read: true } : item);
      renderNotifications(state.notifications);
    }

    setUnreadNotificationsFlag(false);
    return true;
  } catch (err) {
    console.error('acknowledgeNotifications error:', err);
    await syncUnreadNotificationsFlagForUser(userId);
    return false;
  }
}


async function refreshNotificationsView(userId, { acknowledge = false } = {}) {
  const notifications = await fetchNotifications(userId);
  renderNotifications(notifications);
  if (acknowledge) {
    const acked = await acknowledgeNotifications(notifications, userId);
    if (!acked) await syncUnreadNotificationsFlagForUser(userId);
  } else {
    await syncUnreadNotificationsFlagForUser(userId);
  }
}

function startNotificationsRealtime(userId) {
  if (!userId || !supabaseClient) return;
  if (state.realtimeChannel) {
    supabaseClient.removeChannel(state.realtimeChannel);
    state.realtimeChannel = null;
  }

  state.realtimeChannel = supabaseClient
    .channel(`notifications-page:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_notifications',
      filter: `user_id=eq.${userId}`
    }, async () => {
      try {
        await refreshNotificationsView(userId, { acknowledge: false });
      } catch (err) {
        console.error('notifications realtime refresh error:', err);
      }
    })
    .subscribe();
}

function stopNotificationsRealtime() {
  if (state.realtimeChannel && supabaseClient) {
    supabaseClient.removeChannel(state.realtimeChannel);
    state.realtimeChannel = null;
  }
}

async function handleLogout() {
  els.header.logoutBtn.disabled = true;
  els.desktopNav.logoutBtn.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    await refreshAuthUI();
    window.location.href = "index.html";
  } catch (err) {
    console.error("handleLogout error:", err);
  } finally {
    els.header.logoutBtn.disabled = false;
    els.desktopNav.logoutBtn.disabled = false;
  }
}

function bindEvents() {
  bindStandardHeaderEvents(els, {
    onLoginClick: () => {
      window.location.href = "login.html";
    },
    onLogout: handleLogout
  });

  supabaseClient.auth.onAuthStateChange(() => {
    refreshAuthUI().catch((err) => console.error(err));
  });
}

async function initPage() {
  applyRuntimeCurrencySnapshot();

  setLoggedOutView();
  bindEvents();

  const user = await refreshAuthUI();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const notifications = await fetchNotifications(user.id);
  renderNotifications(notifications);
  await acknowledgeNotifications(notifications, user.id);
}

initPage().catch((err) => {
  console.error("initPage error:", err);
  renderNotifications([]);
  if (els.page.emptyTitle) els.page.emptyTitle.textContent = 'Could not load notifications';
  if (els.page.emptyText) els.page.emptyText.textContent = 'Please refresh the page and try again.';
});

window.addEventListener('beforeunload', stopNotificationsRealtime);
