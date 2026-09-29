'use strict';

const STYLE_ID = 'yt-minimal-mode-style';

const HOME_CLASS = 'yt-minimal-home';
const WATCH_CLASS = 'yt-minimal-watch';
const SEARCH_CLASS = 'yt-minimal-search';

const MODE_CLASSES = [HOME_CLASS, WATCH_CLASS, SEARCH_CLASS];

/* =========================================================
   ROUTING
   ========================================================= */

function isHomePage() {
  return location.pathname === '/';
}

function isWatchPage() {
  return location.pathname === '/watch';
}

function isSearchPage() {
  return location.pathname === '/results';
}

/* =========================================================
   CHANNEL URL BLOCKING
   ========================================================= */

function isChannelPath(pathname) {
  return (
    /^\/@[^/]+(?:\/.*)?$/i.test(pathname) ||
    /^\/channel\/[^/]+(?:\/.*)?$/i.test(pathname) ||
    /^\/c\/[^/]+(?:\/.*)?$/i.test(pathname) ||
    /^\/user\/[^/]+(?:\/.*)?$/i.test(pathname)
  );
}

function isChannelUrl(value) {
  if (!value) return false;

  try {
    const url = new URL(value, location.origin);

    if (url.origin !== location.origin) {
      return false;
    }

    return isChannelPath(url.pathname);
  } catch {
    return false;
  }
}

function isChannelAnchor(anchor) {
  return anchor instanceof HTMLAnchorElement && isChannelUrl(anchor.href);
}

function neutralizeChannelAnchor(anchor) {
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (!isChannelAnchor(anchor)) return;

  if (anchor.dataset.ytMinimalChannelBlocked === 'true') {
    return;
  }

  anchor.dataset.ytMinimalChannelBlocked = 'true';

  /*
     Keep the visible channel name/avatar,
     but remove the actual navigation target.
  */
  anchor.removeAttribute('href');

  anchor.setAttribute('aria-disabled', 'true');
  anchor.setAttribute('tabindex', '-1');

  anchor.style.pointerEvents = 'none';
  anchor.style.cursor = 'default';
  anchor.style.textDecoration = 'none';
}

function neutralizeChannelLinks(root = document) {
  if (!root.querySelectorAll) return;

  const anchors = root.querySelectorAll('a[href]');

  for (const anchor of anchors) {
    neutralizeChannelAnchor(anchor);
  }
}

/* =========================================================
   SHORTS -> NORMAL WATCH URL
   ========================================================= */

function getShortIdFromPath(pathname) {
  const match = pathname.match(/^\/shorts\/([^/?#]+)/i);

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function createWatchUrl(shortId) {
  const watchUrl = new URL('/watch', location.origin);
  watchUrl.searchParams.set('v', shortId);
  return watchUrl.href;
}

function shortUrlToWatchUrl(value) {
  try {
    const url = new URL(value, location.origin);

    if (url.origin !== location.origin) {
      return null;
    }

    const shortId = getShortIdFromPath(url.pathname);

    if (!shortId) {
      return null;
    }

    return createWatchUrl(shortId);
  } catch {
    return null;
  }
}

function redirectDirectShortsPage() {
  const shortId = getShortIdFromPath(location.pathname);

  if (!shortId) {
    return false;
  }

  location.replace(createWatchUrl(shortId));

  return true;
}

function normalizeShortAnchor(anchor) {
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (!anchor.href) return;

  const replacement = shortUrlToWatchUrl(anchor.href);

  if (!replacement) return;

  if (anchor.dataset.ytMinimalShortNormalized === 'true') {
    return;
  }

  anchor.dataset.ytMinimalShortNormalized = 'true';
  anchor.href = replacement;
}

function normalizeShortLinks(root = document) {
  if (!root.querySelectorAll) return;

  const anchors = root.querySelectorAll('a[href*="/shorts/"]');

  for (const anchor of anchors) {
    normalizeShortAnchor(anchor);
  }
}

/* =========================================================
   INITIAL DOM CLEANUP
   ========================================================= */

function processMinimalDom(root = document) {
  if (root instanceof HTMLAnchorElement) {
    neutralizeChannelAnchor(root);
    normalizeShortAnchor(root);
  }

  neutralizeChannelLinks(root);
  normalizeShortLinks(root);
}

/* =========================================================
   STYLES
   ========================================================= */

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;

  style.textContent = `
    /* =========================================================
       COMMON
       ========================================================= */

    html.${HOME_CLASS} ytd-rich-item-renderer #channel-name a,
    html.${HOME_CLASS} ytd-rich-item-renderer #channel-avatar,
    html.${HOME_CLASS} ytd-rich-item-renderer #avatar-link,
    html.${WATCH_CLASS} ytd-video-owner-renderer #channel-name a,
    html.${WATCH_CLASS} ytd-video-owner-renderer #avatar,
    html.${WATCH_CLASS} ytd-video-owner-renderer > a,
    html.${SEARCH_CLASS} ytd-video-renderer #channel-name a,
    html.${SEARCH_CLASS} ytd-video-renderer ytd-channel-name a {
      pointer-events: none !important;
      cursor: default !important;
      text-decoration: none !important;
    }

    a[data-yt-minimal-channel-blocked="true"] {
      pointer-events: none !important;
      cursor: default !important;
      text-decoration: none !important;
    }

    html.${HOME_CLASS} ytd-reel-shelf-renderer,
    html.${HOME_CLASS} ytd-shorts,
    html.${HOME_CLASS} ytd-shorts-shelf-renderer,
    html.${HOME_CLASS} ytd-guide-entry-renderer:has(a[href*="/shorts/"]),
    html.${HOME_CLASS} ytd-chip-cloud-chip-renderer:has(a[href*="/shorts/"]),
    html.${SEARCH_CLASS} ytd-reel-shelf-renderer,
    html.${SEARCH_CLASS} ytd-shorts,
    html.${SEARCH_CLASS} ytd-shorts-shelf-renderer,
    html.${SEARCH_CLASS} ytd-guide-entry-renderer:has(a[href*="/shorts/"]),
    html.${SEARCH_CLASS} ytd-chip-cloud-chip-renderer:has(a[href*="/shorts/"]) {
      display: none !important;
    }

    /* =========================================================
       SHARED MINIMAL HEADER
       ========================================================= */

    #guide-button,
    ytd-logo,
    #logo,
    #voice-search-button,
    ytd-create-button,
    #notification-button,
    ytd-notification-topbar-button-renderer,
    ytd-masthead #buttons ytd-button-renderer:has(button[aria-label*="Create" i]),
    ytd-masthead #buttons ytd-topbar-menu-button-renderer:has(button[aria-label*="Create" i]),
    ytd-masthead #buttons yt-button-view-model:has(button[aria-label*="Create" i]),
    ytd-masthead #buttons ytd-topbar-menu-button-renderer:has(button[aria-label*="Notification" i]),
    ytd-masthead #buttons yt-button-view-model:has(button[aria-label*="Notification" i]) {
      display: none !important;
    }

    /* =========================================================
       HOME PAGE
       ========================================================= */

    html.${HOME_CLASS} ytd-rich-grid-renderer #contents > ytd-rich-item-renderer:nth-of-type(n + 2) {
      display: none !important;
    }

    html.${HOME_CLASS} ytd-rich-section-renderer,
    html.${HOME_CLASS} ytd-reel-shelf-renderer,
    html.${HOME_CLASS} ytd-feed-filter-chip-bar-renderer,
    html.${HOME_CLASS} ytd-continuation-item-renderer {
      display: none !important;
    }

    html.${HOME_CLASS} ytd-guide-renderer,
    html.${HOME_CLASS} ytd-mini-guide-renderer {
      display: none !important;
    }

    html.${HOME_CLASS} ytd-page-manager {
      margin-left: 0 !important;
    }

    html.${HOME_CLASS},
    html.${HOME_CLASS} body {
      overflow-x: hidden !important;
      overflow-y: auto !important;
      overscroll-behavior-x: none !important;
    }

    html.${HOME_CLASS} ytd-rich-grid-renderer #contents {
      display: grid !important;
      grid-template-columns: minmax(0, min(900px, 100%)) !important;
      justify-content: center !important;
      gap: 28px 18px !important;
      padding: 18px 24px 40px !important;
      align-items: start !important;
      width: auto !important;
      max-width: none !important;
    }

    html.${HOME_CLASS} ytd-rich-grid-renderer #contents > ytd-rich-item-renderer {
      width: auto !important;
      min-width: 0 !important;
      margin: 0 !important;
      height: auto !important;
      min-height: 0 !important;
    }

    html.${HOME_CLASS} ytd-rich-grid-renderer,
    html.${HOME_CLASS} ytd-rich-grid-renderer #contents,
    html.${HOME_CLASS} ytd-rich-grid-renderer ytd-rich-item-renderer {
      max-height: none !important;
    }

    html.${HOME_CLASS} ytd-rich-item-renderer #video-title,
    html.${HOME_CLASS} ytd-rich-item-renderer #video-title-link {
      display: -webkit-box !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 2 !important;
      overflow: hidden !important;
      line-height: 1.35 !important;
      max-height: 2.7em !important;
      white-space: normal !important;
    }

    html.${HOME_CLASS} ytd-rich-item-renderer ytd-thumbnail {
      display: block !important;
      overflow: hidden !important;
      border-radius: 10px !important;
      aspect-ratio: 16 / 9 !important;
      height: auto !important;
    }

    html.${HOME_CLASS} ytd-rich-item-renderer #metadata-line,
    html.${HOME_CLASS} ytd-rich-item-renderer #video-meta-block #metadata-line,
    html.${HOME_CLASS} ytd-rich-item-renderer #video-info,
    html.${HOME_CLASS} ytd-rich-item-renderer .ytd-video-meta-block,
    html.${HOME_CLASS} ytd-rich-item-renderer #channel-avatar,
    html.${HOME_CLASS} ytd-rich-item-renderer #avatar-link,
    html.${HOME_CLASS} ytd-rich-item-renderer #channel-name,
    html.${HOME_CLASS} ytd-rich-item-renderer #menu,
    html.${HOME_CLASS} ytd-rich-item-renderer ytd-menu-renderer,
    html.${HOME_CLASS} ytd-rich-item-renderer #button-container,
    html.${HOME_CLASS} ytd-rich-item-renderer button[aria-label*="Follow" i],
    html.${HOME_CLASS} ytd-rich-item-renderer button[aria-label*="Subscribe" i] {
      display: none !important;
    }

    html.${HOME_CLASS} ytd-rich-item-renderer #details {
      padding-top: 8px !important;
    }

    html.${HOME_CLASS} ytd-rich-item-renderer #channel-name {
      margin-top: 6px !important;
    }

    html.${HOME_CLASS} ytd-rich-item-renderer {
      contain: layout paint !important;
      transition: opacity 120ms ease-out, transform 120ms ease-out !important;
    }

    @media (max-width: 900px) {
      html.${HOME_CLASS} ytd-rich-grid-renderer #contents {
        grid-template-columns: minmax(0, min(900px, 100%)) !important;
      }
    }

    @media (max-width: 600px) {
      html.${HOME_CLASS} ytd-rich-grid-renderer #contents {
        grid-template-columns: minmax(0, min(900px, 100%)) !important;
        gap: 20px !important;
        padding: 12px 12px 32px !important;
      }
    }

    /* =========================================================
       WATCH PAGE
       ========================================================= */

    html.${WATCH_CLASS} ytd-watch-flexy #secondary,
    html.${WATCH_CLASS} ytd-watch-flexy #related,
    html.${WATCH_CLASS} ytd-watch-flexy ytd-watch-next-secondary-results-renderer {
      display: none !important;
    }

    html.${WATCH_CLASS} #comments,
    html.${WATCH_CLASS} ytd-comments {
      display: none !important;
    }

    html.${WATCH_CLASS} ytd-watch-flexy[is-two-columns] #primary {
      width: 100% !important;
      max-width: none !important;
    }

    html.${WATCH_CLASS} ytd-watch-info-text #info,
    html.${WATCH_CLASS} ytd-watch-info-text #view-count,
    html.${WATCH_CLASS} ytd-watch-info-text #date-text,
    html.${WATCH_CLASS} ytd-video-view-count-renderer {
      display: none !important;
    }

    html.${WATCH_CLASS} segmented-like-dislike-button-view-model,
    html.${WATCH_CLASS} ytd-segmented-like-dislike-button-renderer,
    html.${WATCH_CLASS} like-button-view-model,
    html.${WATCH_CLASS} dislike-button-view-model,
    html.${WATCH_CLASS} ytd-watch-metadata button[aria-label*="Ask" i],
    html.${WATCH_CLASS} ytd-watch-metadata yt-button-view-model:has(button[aria-label*="Ask" i]),
    html.${WATCH_CLASS} ytd-watch-metadata ytd-button-renderer:has(button[aria-label*="Ask" i]),
    html.${WATCH_CLASS} ytd-watch-metadata button[aria-label*="Save" i],
    html.${WATCH_CLASS} ytd-watch-metadata button[title*="Save" i],
    html.${WATCH_CLASS} ytd-watch-metadata yt-button-view-model:has(button[aria-label*="Save" i]),
    html.${WATCH_CLASS} ytd-watch-metadata ytd-button-renderer:has(button[aria-label*="Save" i]),
    html.${WATCH_CLASS} ytd-watch-metadata button[aria-label*="Follow" i],
    html.${WATCH_CLASS} ytd-watch-metadata yt-button-view-model:has(button[aria-label*="Follow" i]),
    html.${WATCH_CLASS} ytd-watch-metadata ytd-button-renderer:has(button[aria-label*="Follow" i]) {
      display: none !important;
    }

    html.${WATCH_CLASS} ytd-video-owner-renderer #channel-name a,
    html.${WATCH_CLASS} ytd-video-owner-renderer #avatar,
    html.${WATCH_CLASS} ytd-video-owner-renderer > a,
    html.${WATCH_CLASS} ytd-video-owner-renderer a.yt-simple-endpoint {
      pointer-events: none !important;
      cursor: default !important;
    }

    html.${WATCH_CLASS} ytd-video-owner-renderer button[aria-label*="Go to channel" i],
    html.${WATCH_CLASS} ytd-watch-metadata button[aria-label*="Go to channel" i],
    html.${WATCH_CLASS} ytd-watch-metadata button[title*="Go to channel" i],
    html.${WATCH_CLASS} ytd-video-owner-renderer yt-button-view-model:has(button[aria-label*="Go to channel" i]) {
      display: none !important;
    }

    /* =========================================================
       SEARCH PAGE
       ========================================================= */

    html.${SEARCH_CLASS} ytd-guide-renderer,
    html.${SEARCH_CLASS} ytd-mini-guide-renderer {
      display: none !important;
    }

    html.${SEARCH_CLASS} ytd-page-manager {
      margin-left: 0 !important;
    }
  `;

  (document.head || document.documentElement).appendChild(style);
}

/* =========================================================
   PAGE STATE
   ========================================================= */

function updatePageState() {
  const html = document.documentElement;

  for (const className of MODE_CLASSES) {
    html.classList.remove(className);
  }

  if (isHomePage()) {
    html.classList.add(HOME_CLASS);
  }

  if (isWatchPage()) {
    html.classList.add(WATCH_CLASS);
  }

  if (isSearchPage()) {
    html.classList.add(SEARCH_CLASS);
  }
}

/* =========================================================
   SPA NAVIGATION
   ========================================================= */

function initializeNavigation() {
  window.addEventListener(
    'yt-navigate-start',
    () => {
      for (const className of MODE_CLASSES) {
        document.documentElement.classList.remove(className);
      }
    },
    { passive: true },
  );

  window.addEventListener(
    'yt-navigate-finish',
    () => {
      updatePageState();
      processMinimalDom();
    },
    { passive: true },
  );

  window.addEventListener(
    'popstate',
    () => {
      updatePageState();
      processMinimalDom();
    },
    { passive: true },
  );
}

/* =========================================================
   CLICK GUARD
   ========================================================= */

function initializeNavigationGuards() {
  document.addEventListener(
    'click',
    (event) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest('a[href]')
          : null;

      if (!anchor) return;

      if (isChannelAnchor(anchor)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }

      const replacement = shortUrlToWatchUrl(anchor.href);

      if (replacement) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        location.href = replacement;
      }
    },
    true,
  );

  document.addEventListener(
    'auxclick',
    (event) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest('a[href]')
          : null;

      if (!anchor) return;

      if (isChannelAnchor(anchor)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }

      const replacement = shortUrlToWatchUrl(anchor.href);

      if (replacement) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        location.href = replacement;
      }
    },
    true,
  );
}

/* =========================================================
   MUTATION OBSERVER
   ========================================================= */

function initializeObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) {
          continue;
        }

        processMinimalDom(node);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

function initialize() {
  if (redirectDirectShortsPage()) {
    return;
  }

  installStyles();
  updatePageState();
  processMinimalDom();

  initializeNavigation();
  initializeNavigationGuards();
  initializeObserver();
}

initialize();
