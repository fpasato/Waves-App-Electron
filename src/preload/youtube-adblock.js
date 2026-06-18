// src/preload/youtube-adblock.js  ← injeta no webview via preload

(function () {
  'use strict';

  const SELECTORS = {
    skipButton: '.ytp-skip-ad-button, .ytp-ad-skip-button, button[class*="skip"]',
    adOverlay: '.ytp-ad-overlay-container',
    adBanner: '.ytd-banner-promo-renderer, #masthead-ad',
    adContainer: 'ytd-ad-slot-renderer, #player-ads, .ytd-promoted-sparkles-web-renderer',
    adVideoContainer: '.ad-showing',
  };

  function skipAd() {
    // Clicar no botão de pular se existir
    const skipBtn = document.querySelector(SELECTORS.skipButton);
    if (skipBtn) {
      skipBtn.click();
      return;
    }

    // Se estiver em um anúncio de vídeo, avançar para o fim
    const video = document.querySelector('video');
    const adShowing = document.querySelector('.ad-showing');

    if (video && adShowing) {
      // Avançar o vídeo para o final força o skip
      video.currentTime = video.duration;
      video.muted = true; // garante que não conta como "assistido"
    }
  }

  function removeAdElements() {
    Object.values(SELECTORS).forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (!el.closest('ytd-watch-flexy') || el.classList.contains('ad-showing')) {
          // só remove se não for o player principal
        }
        el.remove();
      });
    });

    // Remover banners e overlays de ad
    document.querySelectorAll(
      'ytd-ad-slot-renderer, ytd-banner-promo-renderer, ' +
      '#masthead-ad, ytd-promoted-sparkles-web-renderer, ' +
      'ytd-statement-banner-renderer, ytd-in-feed-ad-layout-renderer'
    ).forEach(el => el.remove());
  }

  // Observer para detectar ads assim que aparecem
  const observer = new MutationObserver(() => {
    if (document.querySelector('.ad-showing')) {
      skipAd();
    }
    removeAdElements();
  });

  // Polling como fallback (YouTube às vezes escapa do MutationObserver)
  setInterval(() => {
    if (document.querySelector('.ad-showing, .ytp-ad-skip-button')) {
      skipAd();
    }
  }, 50);

  function init() {
    observer.observe(document.body, { childList: true, subtree: true });
    removeAdElements();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();