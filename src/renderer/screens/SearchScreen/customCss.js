export const CUSTOM_CSS = `
  /* Shorts */
  ytd-guide-entry-renderer:has(a[title="Shorts"]) { display: none !important; }

  /* Mais do YouTube, rodapé, etc */
  ytd-guide-collapsible-entry-renderer { display: none !important; }
  ytd-guide-section-renderer:has(a[href*="premium"]) { display: none !important; }
  ytd-guide-renderer #footer { display: none !important; }

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
`;

// export const SKIP_ADS_SCRIPT = `
// (function () {
//   if (window.__adSkipTimer) clearInterval(window.__adSkipTimer);
//   if (window.__adSkipObserver) window.__adSkipObserver.disconnect();

//   // Reseta o patch de fetch em cada injeção
//   window.__fetchPatched = false;

//   if (!window.__fetchPatched) {
//     window.__fetchPatched = true;

//     const _fetch = window.__originalFetch || window.fetch;
//     window.__originalFetch = _fetch;

//     window.fetch = async function(...args) {
//       const response = await _fetch.apply(this, args);
//       const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
//       if (url.includes('/youtubei/v1/player')) {
//         try {
//           const json = await response.clone().json();
//           delete json.adPlacements;
//           delete json.playerAds;
//           delete json.adSlots;
//           return new Response(JSON.stringify(json), {
//             status: response.status,
//             statusText: response.statusText,
//             headers: response.headers,
//           });
//         } catch { return response; }
//       }
//       return response;
//     };
//   }

//   function skipAds() {
//     const skip = document.querySelector(
//       '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern'
//     );
//     if (skip) { skip.click(); return; }

//     const video = document.querySelector('video');
//     const isAd = document.querySelector('.ad-showing, .ytp-ad-badge');
//     if (video && isAd && isFinite(video.duration)) {
//       video.muted = true;
//       video.currentTime = video.duration;
//     }
//   }

//   window.__adSkipTimer = setInterval(skipAds, 100);

//   window.__adSkipObserver = new MutationObserver(skipAds);
//   window.__adSkipObserver.observe(document.documentElement, {
//     childList: true,
//     subtree: true,
//     attributes: true,
//     attributeFilter: ['class'],
//   });

//   skipAds();
// })()
// `;



export const SKIP_ADS_SCRIPT = function () {
  // Guard de idempotência: este script é re-injetado em todo
  // "dom-ready" e "did-stop-loading", então sem isso cada injeção
  // criaria um setInterval + MutationObserver novos, empilhando
  // dezenas deles numa sessão de uso (vazamento de memória/CPU).
  if (window.__waves_adskip_active__) return;
  window.__waves_adskip_active__ = true;
 
  const SKIP_BUTTON_SELECTORS = [
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-skip-ad-button",
    "button.ytp-ad-skip-button-container",
  ];
 
  const AD_OVERLAY_CLOSE_SELECTORS = [".ytp-ad-overlay-close-button"];
 
  let lastTick = 0;
  const THROTTLE_MS = 200;
 
  function findSkipButton() {
    for (const selector of SKIP_BUTTON_SELECTORS) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }
 
  function clickIfVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    el.click();
    return true;
  }
 
  function isAdShowing() {
    const player = document.querySelector(".html5-video-player");
    return !!player && player.classList.contains("ad-showing");
  }
 
  function fastForwardAd() {
    const video = document.querySelector(".ad-showing video.html5-main-video, .ad-showing video");
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      try {
        video.currentTime = video.duration;
      } catch (e) {
        // seek bloqueado pelo player nesse ad — sem problema, o mute cobre.
      }
    }
  }
 
  function muteAdAudio(mute) {
    const video = document.querySelector("video.html5-main-video");
    if (video) video.muted = mute;
  }
 
  function tick() {
    const now = Date.now();
    if (now - lastTick < THROTTLE_MS) return;
    lastTick = now;
 
    if (!isAdShowing()) {
      muteAdAudio(false);
      return;
    }
 
    muteAdAudio(true);
 
    const skipBtn = findSkipButton();
    if (skipBtn && clickIfVisible(skipBtn)) return;
 
    for (const selector of AD_OVERLAY_CLOSE_SELECTORS) {
      const overlay = document.querySelector(selector);
      if (overlay) clickIfVisible(overlay);
    }
 
    fastForwardAd();
  }
 
  const pollId = setInterval(tick, 200);
  window.__waves_adskip_poll_id__ = pollId;
 
  const observer = new MutationObserver(() => tick());
  window.__waves_adskip_observer__ = observer;
 
  function attachObserver() {
    const player = document.querySelector("#movie_player, .html5-video-player");
    if (player) {
      observer.observe(player, {
        attributes: true,
        attributeFilter: ["class"],
        childList: true,
        subtree: true,
      });
    } else {
      setTimeout(attachObserver, 500);
    }
  }
 
  attachObserver();
 
  // SPA do YouTube: ao trocar de vídeo sem reload completo, o
  // player é recriado — reanexa o observer nesses eventos.
  document.addEventListener("yt-navigate-finish", attachObserver);
  document.addEventListener("yt-page-data-updated", attachObserver);
};