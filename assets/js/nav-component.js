/**
 * nav-component.js
 * Injecteert de desktop- en mobiele navigatie in elke pagina.
 * Staat als eerste <script> in <body>, vóór app.js.
 *
 * Wil je een item toevoegen/verwijderen/hernoemen?
 * Pas alleen NAV_ITEMS hieronder aan — verder niets.
 */

(function () {

  // ─── Navigatie-items ────────────────────────────────────────────────────────
  const NAV_ITEMS = [
    {
      id:    'Radio',
      href:  'index.html',
      label: 'Radio',
      icon:  'radio.png',
    },
    {
      id:     'Profile',
      href:   'join.html',
      label:  'Profile',
      icon:   'profile.png',
      hidden: true,
    },
    {
      id:     'Notifications',
      href:   'notifications.html',
      label:  'Notifications',
      icon:   'nonotifications.png',
      hidden: true,
    },
    {
      id:     'Liked',
      href:   'liked.html',
      label:  'Liked',
      icon:   'like.png',
      hidden: true,
    },
    {
      id:          'Stats',
      href:        'statistics.html',
      label:       'Statistics',
      icon:        'stats.png',
      hidden:      true,
      desktopOnly: true,
    },
    {
      id:          'Track',
      href:        'submit-track.html',
      label:       'Tune',
      icon:        'track.png',
      hidden:      true,
      desktopOnly: true,
    },
    // ── Onderin de desktop-zijbalk ───────────────────────────────────────────
    {
      id:       'Login',
      href:     'login.html',
      label:    'Login',
      icon:     'login.png',
      position: 'bottom',
    },
    {
      id:       'Logout',
      label:    'Logout',
      icon:     'logout.png',
      hidden:   true,
      type:     'button',
      position: 'bottom',
    },
  ];

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const currentPage = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  function isActive(href) {
    return href && href.toLowerCase() === currentPage;
  }

  function iconMask(iconFile) {
    return `<span class="nav-icon-mask" style="--icon-url: url('/icons/${iconFile}');"></span>`;
  }

  // ─── Desktop item ───────────────────────────────────────────────────────────

  function desktopItem(item) {
    const active = isActive(item.href) ? ' active' : '';
    const hidden = item.hidden ? ' hidden' : '';
    const id     = item.id ? ` id="desktop${item.id}${item.type === 'button' ? 'Btn' : 'Link'}"` : '';
    const inner  = `
          <span class="desktop-nav-icon" aria-hidden="true">${iconMask(item.icon)}</span>
          <span class="desktop-nav-label">${item.label}</span>`;

    if (item.type === 'button') {
      return `<button${id} class="desktop-nav-button${hidden}" type="button" aria-label="${item.label}">${inner}
        </button>`;
    }
    return `<a${id} class="desktop-nav-link${active}${hidden}" href="${item.href}" aria-label="${item.label}">${inner}
        </a>`;
  }

  // ─── Mobiel item ────────────────────────────────────────────────────────────

  function mobileItem(item) {
    const active = isActive(item.href) ? ' active' : '';
    const hidden = item.hidden ? ' hidden' : '';
    const id     = item.id ? ` id="mobile${item.id}Link"` : '';

    return `<a${id} class="mobile-nav-link${active}${hidden}" href="${item.href}" aria-label="${item.label}">
        <span class="mobile-nav-icon" aria-hidden="true">${iconMask(item.icon)}</span>
        <span class="mobile-nav-label">${item.label}</span>
      </a>`;
  }

  // ─── HTML opbouwen ──────────────────────────────────────────────────────────

  const mainItems   = NAV_ITEMS.filter(i => i.position !== 'bottom');
  const bottomItems = NAV_ITEMS.filter(i => i.position === 'bottom');

  // Mobiel: geen desktopOnly items, geen buttons — login wel meenemen
  const mobileItems = [
    ...NAV_ITEMS.filter(i => i.position !== 'bottom' && !i.desktopOnly && i.type !== 'button'),
    ...NAV_ITEMS.filter(i => i.id === 'Login'),
  ];

  const desktopHTML = `<aside class="desktop-side-nav" aria-label="Desktop navigation">
    <div class="desktop-side-nav-panel">
      <nav class="desktop-side-links">
        ${mainItems.map(desktopItem).join('\n        ')}
      </nav>
      <div class="desktop-side-bottom">
        ${bottomItems.map(desktopItem).join('\n        ')}
      </div>
    </div>
  </aside>`;

  const mobileHTML = `<div class="mobile-bottom-nav-wrap">
    <nav class="mobile-bottom-nav" aria-label="Mobile navigation">
      ${mobileItems.map(mobileItem).join('\n      ')}
    </nav>
  </div>`;

  // ─── Injecteren via currentScript (werkt synchroon, geen document.write) ───
  // currentScript verwijst naar dit <script> element terwijl het wordt geparsed.
  // insertAdjacentHTML('beforebegin') plaatst de nav-HTML vlak vóór het script-element,
  // zodat de DOM-elementen bestaan voordat app.js ze opzoekt via getElementById.

  var self = document.currentScript;
  if (self) {
    self.insertAdjacentHTML('beforebegin', desktopHTML + mobileHTML);
  } else {
    // Fallback voor oude browsers: toevoegen aan het begin van <body>
    document.body.insertAdjacentHTML('afterbegin', desktopHTML + mobileHTML);
  }

})();
