(function () {
  'use strict';

  // ── Skip e ocultação ────────────────────────────────────────────────────────

  function trySkipAd() {
    const skipBtn = document.querySelector(
      '.ytp-skip-ad-button, .ytp-ad-skip-button, button[class*="skip"]'
    );
    if (skipBtn) { skipBtn.click(); return true; }

    const video = document.querySelector('video');
    const adShowing = document.querySelector('.ad-showing');
    if (video && adShowing) {
      const dur = video.duration;
      if (Number.isFinite(dur) && dur > 0) {
        video.currentTime = dur - 0.1;
        video.muted = true;
        return true;
      }
    }
    return false;
  }

  const HIDE_SELECTORS = [
    'ytd-ad-slot-renderer',
    'ytd-banner-promo-renderer',
    '#masthead-ad',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-statement-banner-renderer',
    'ytd-in-feed-ad-layout-renderer',
    '.ytp-ad-overlay-container',
  ];

  function hideAdElements() {
    document.querySelectorAll(HIDE_SELECTORS.join(',')).forEach(el => {
      el.style.display = 'none';
      el.hidden = true;
    });
  }

  function trySkipAndHide() { trySkipAd(); hideAdElements(); }

  // ── Navegação ───────────────────────────────────────────────────────────────

  let aggressiveUntil = 0;

  function onNavigation() {
    aggressiveUntil = Date.now() + 5000;
    setTimeout(trySkipAndHide, 100);
    setTimeout(trySkipAndHide, 600);
    setTimeout(trySkipAndHide, 1500);
    setTimeout(trySkipAndHide, 3000);
  }

  // Eventos nativos do YouTube
  window.addEventListener('yt-navigate-finish', onNavigation);
  document.addEventListener('yt-page-data-updated', onNavigation);

  // Fix para sessões longas: intercepta navegações SPA que não disparam os eventos acima
  const _push = history.pushState.bind(history);
  const _replace = history.replaceState.bind(history);
  history.pushState = (...args) => { _push(...args); onNavigation(); };
  history.replaceState = (...args) => { _replace(...args); onNavigation(); };
  window.addEventListener('popstate', onNavigation);

  // ── Polling adaptativo ──────────────────────────────────────────────────────

  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(trySkipAndHide, 50);
  });

  function fallbackPolling() {
    const hasAd = !!document.querySelector('.ad-showing, .ytp-ad-skip-button');
    const isAggressive = Date.now() < aggressiveUntil;
    if (hasAd || isAggressive) trySkipAndHide();
    setTimeout(fallbackPolling, hasAd || isAggressive ? 300 : 2000);
  }

  // ── Init ────────────────────────────────────────────────────────────────────

  function init() {
    observer.observe(document.body, { childList: true, subtree: true });
    trySkipAndHide();
    fallbackPolling();
    onNavigation(); // trata a página já carregada
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();