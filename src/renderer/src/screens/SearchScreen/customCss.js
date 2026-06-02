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

   /* ── Ads no feed/menu ── */
  /* Card de anúncio disfarçado de vídeo */
  ytd-rich-item-renderer:has([aria-label*="Patrocinado"]),
  ytd-rich-item-renderer:has([aria-label*="Sponsored"]) { display: none !important; }

  /* Shelf de anúncio */
  ytd-rich-shelf-renderer:has(ytd-ad-slot-renderer) { display: none !important; }

  /* Overlay de anúncio no player — esconde até o script pular */
  .ytp-ad-player-overlay,
  .ytp-ad-player-overlay-instream-info,
  .ytp-ad-preview-container,
  .ytp-ad-preview-text,
  .ytp-ad-badge,
  .ytp-ad-progress,
  .ytp-ad-progress-list { display: none !important; }

  /* Tela preta durante carregamento do ad */
  .ytp-ad-module { display: none !important; }

  /* Painel lateral de anúncios */
  #related #player-ads { display: none !important; }
  ytd-item-section-renderer:has(ytd-ad-slot-renderer) { display: none !important; }


  /* Primeiro card de ad no feed */
  /* Remove qualquer item que contenha um display-ad-renderer */
  ytd-rich-item-renderer:has(ytd-display-ad-renderer) { display: none !important; }
  ytd-display-ad-renderer { display: none !important; }

  /* Remove banner de anúncio no topo da página inicial */
  ytd-banner-promo-renderer { display: none !important; }
  ytd-statement-banner-renderer { display: none !important; }

  /* ── Remove botão de login da topbar ── */
  #buttons a[href*="ServiceLogin"] { display: none !important; }
  /* ou, se necessário, o container inteiro */
  #buttons ytd-button-renderer:has(a[href*="ServiceLogin"]) { display: none !important; }

  /* ── Remove bloco "Faça login para curtir..." da sidebar ── */
  ytd-guide-signin-promo-renderer { display: none !important; }

  /* ── (Opcional) Remove o link "Pular navegação" (acessibilidade) ── */
  #skip-navigation { display: none !important; }
`;

export const SKIP_ADS_SCRIPT = `
(function () {
  if (window.__adSkipTimer) clearInterval(window.__adSkipTimer);
  if (window.__adSkipObserver) window.__adSkipObserver.disconnect();

  // Reseta o patch de fetch em cada injeção
  window.__fetchPatched = false;

  if (!window.__fetchPatched) {
    window.__fetchPatched = true;

    const _fetch = window.__originalFetch || window.fetch;
    window.__originalFetch = _fetch;

    window.fetch = async function(...args) {
      const response = await _fetch.apply(this, args);
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (url.includes('/youtubei/v1/player')) {
        try {
          const json = await response.clone().json();
          delete json.adPlacements;
          delete json.playerAds;
          delete json.adSlots;
          return new Response(JSON.stringify(json), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        } catch { return response; }
      }
      return response;
    };
  }

  function skipAds() {
    const skip = document.querySelector(
      '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern'
    );
    if (skip) { skip.click(); return; }

    const video = document.querySelector('video');
    const isAd = document.querySelector('.ad-showing, .ytp-ad-badge');
    if (video && isAd && isFinite(video.duration)) {
      video.muted = true;
      video.currentTime = video.duration;
    }
  }

  window.__adSkipTimer = setInterval(skipAds, 100);

  window.__adSkipObserver = new MutationObserver(skipAds);
  window.__adSkipObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  skipAds();
})()
`;
