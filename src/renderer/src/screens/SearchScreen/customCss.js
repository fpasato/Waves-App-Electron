export const CUSTOM_CSS = `
  /* Shorts */
  ytd-guide-entry-renderer:has(a[title="Shorts"]) { display: none !important; }

  /* Inscrições */
  ytd-guide-entry-renderer:has(a[href="/feed/subscriptions"]) { display: none !important; }

  /* Você */
  ytd-guide-entry-renderer:has(a[href="/feed/you"]) { display: none !important; }

  /* Assistir mais tarde */
  ytd-guide-entry-renderer:has(a[href*="list=WL"]) { display: none !important; }

  /* Downloads */
  ytd-guide-entry-renderer:has(a[href="/feed/downloads"]) { display: none !important; }

  /* Explorar (seção) */
  ytd-guide-section-renderer:has(a[href="/feed/explore"]) { display: none !important; }

  /* Shopping */
  ytd-guide-entry-renderer:has(a[href*="UCkYQyvc_i9hXEo4xic9Hh2g"]) { display: none !important; }

  /* Música */
  ytd-guide-entry-renderer:has(a[href*="UC-9-kyTW8ZkZNDHQJ6FgpwQ"]) { display: none !important; }

  /* Filmes */
  ytd-guide-entry-renderer:has(a[href*="storefront"]) { display: none !important; }

  /* Mais do YouTube, rodapé, etc */
  ytd-guide-collapsible-entry-renderer { display: none !important; }
  ytd-guide-section-renderer:has(a[href*="premium"]) { display: none !important; }
  ytd-guide-renderer #footer { display: none !important; }

  /* +Criar, sino, avatar, voz */
  ytd-masthead #buttons ytd-topbar-menu-button-renderer { display: none !important; }
  #notification-button { display: none !important; }
  button[aria-label="Criar"] { display: none !important; }
  button[aria-label="Notificações"] { display: none !important; }
  #voice-search-button { display: none !important; }
  #avatar-btn { display: none !important; }

  /* Vídeos com Gostei */
  ytd-guide-entry-renderer:has(a[href*="list=LL"]) { display: none !important; }

  /* Explorar */
  ytd-guide-entry-renderer:has(a[href="/feed/explore"]) { display: none !important; }
  ytd-guide-section-renderer:has(a[href="/feed/explore"]) { display: none !important; }

  /* Histórico de denúncias */
  ytd-guide-entry-renderer:has(a[href="/reporthistory"]) { display: none !important; }

  /* Mini sidebar (quando fechada) */
  ytd-mini-guide-entry-renderer:has(a[title="Shorts"]) { display: none !important; }
  ytd-mini-guide-entry-renderer:has(a[href="/feed/subscriptions"]) { display: none !important; }
  ytd-mini-guide-entry-renderer:has(a[href="/feed/you"]) { display: none !important; }

  /* Descrição */
  #description-inner { display: none !important; }
  #bottom-row { display: none !important; }

  /* Comentários */
  ytd-comments { display: none !important; }

  /* Inscrever-se e contagem de inscritos */
  #subscribe-button { display: none !important; }
  #owner-sub-count { display: none !important; }

  /* Compartilhar e botão ... (menu de ações) */
  #actions { display: none !important; }

  /* Shorts - todas as variações */
  ytd-rich-section-renderer:has(a[href="/shorts"]) { display: none !important; }
  ytd-reel-shelf-renderer { display: none !important; }
  ytd-rich-shelf-renderer:has(a[href="/shorts"]) { display: none !important; }
  ytd-rich-item-renderer:has(a[href*="/shorts/"]) { display: none !important; }
  [is-shorts] { display: none !important; }

  /* Cards de eventos/ingressos */
  ytd-event-details-renderer { display: none !important; }
  ytd-merch-shelf-renderer { display: none !important; }
  ytd-ticket-shelf-renderer { display: none !important; }

  /* Logo do YouTube na topbar */
  #logo { display: none !important; }
  ytd-topbar-logo-renderer { display: none !important; }
  #center { display: none !important; }

  /* Slots de anúncio no feed */
  ytd-ad-slot-renderer { display: none !important; }
  ytd-rich-item-renderer:has(ytd-ad-slot-renderer) { display: none !important; }

  /* Player de anúncio — esconde overlay enquanto o script não pula */
  .ytp-ad-overlay-container { display: none !important; }
  .ytp-ad-text-overlay { display: none !important; }
`;

// Injeta no webview via executeJavaScript no dom-ready.
// Roda a cada 300ms: clica em "Pular", fecha overlays e
// avança o vídeo de ad para o fim forçando o skip.
export const SKIP_ADS_SCRIPT = `
(function () {
  if (window.__adSkipperRunning) return;
  window.__adSkipperRunning = true;

  let skipTimer;
  let observer;

  // ── Função principal de limpeza ──────────────────────────────
  function skipAds() {
    // 1. Botão "Pular anúncio" (qualquer variante)
    const skipBtn = document.querySelector(
      '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern'
    );
    if (skipBtn) {
      skipBtn.click();
    }

    // 2. Overlay de banner (fecha o "X")
    const overlayClose = document.querySelector('.ytp-ad-overlay-close-button');
    if (overlayClose) {
      overlayClose.click();
    }

    // 3. Anúncio de vídeo em execução → avança para o fim
    const video = document.querySelector('video');
    const isAd =
      document.querySelector('.ytp-ad-player-overlay') ||
      document.querySelector('.ytp-ad-badge');
    if (video && isAd && video.duration && !isNaN(video.duration)) {
      video.currentTime = video.duration;  // força o término do ad
    }

    // 4. Garante que o vídeo principal volte a tocar após o ad
    const mainVideo = document.querySelector('.html5-main-video');
    if (
      mainVideo &&
      mainVideo.paused &&
      !document.querySelector('.ytp-ad-player-overlay') // não estamos mais em um ad
    ) {
      mainVideo.play().catch(() => {});
    }

    // 5. Remove qualquer overlay de anúncio que tenha sobrado (banners, info)
    document
      .querySelectorAll(
        '.ytp-ad-overlay-container, .ytp-ad-overlay-ad-info-button-container, .ytp-ad-action-interstitial'
      )
      .forEach((el) => el.remove());
  }

  // ── Polling rápido como fallback (100ms) ─────────────────────
  skipTimer = setInterval(skipAds, 100);

  // ── MutationObserver: reage a cada elemento novo no DOM ──────
  observer = new MutationObserver(() => {
    // Dispara imediatamente, sem esperar o próximo tick do timer
    skipAds();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Limpeza opcional se a página for navegada (SPA)
  window.addEventListener('beforeunload', () => {
    clearInterval(skipTimer);
    observer.disconnect();
  }, { once: true });
})();
`;