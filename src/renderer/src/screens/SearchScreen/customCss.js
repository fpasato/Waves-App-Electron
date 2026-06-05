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

// export const CUSTOM_CSS = `
//   /* Shorts */
//   ytd-guide-entry-renderer:has(a[title="Shorts"]) { display: none !important; }

//   /* Inscrições */
//   ytd-guide-entry-renderer:has(a[href="/feed/subscriptions"]) { display: none !important; }

//   /* Você */
//   ytd-guide-entry-renderer:has(a[href="/feed/you"]) { display: none !important; }

//   /* Assistir mais tarde */
//   ytd-guide-entry-renderer:has(a[href*="list=WL"]) { display: none !important; }

//   /* Downloads */
//   ytd-guide-entry-renderer:has(a[href="/feed/downloads"]) { display: none !important; }

//   /* Explorar (seção) */
//   ytd-guide-section-renderer:has(a[href="/feed/explore"]) { display: none !important; }

//   /* Shopping */
//   ytd-guide-entry-renderer:has(a[href*="UCkYQyvc_i9hXEo4xic9Hh2g"]) { display: none !important; }

//   /* Música */
//   ytd-guide-entry-renderer:has(a[href*="UC-9-kyTW8ZkZNDHQJ6FgpwQ"]) { display: none !important; }

//   /* Filmes */
//   ytd-guide-entry-renderer:has(a[href*="storefront"]) { display: none !important; }

//   /* Mais do YouTube, rodapé, etc */
//   ytd-guide-collapsible-entry-renderer { display: none !important; }
//   ytd-guide-section-renderer:has(a[href*="premium"]) { display: none !important; }
//   ytd-guide-renderer #footer { display: none !important; }

//   /* +Criar, sino, avatar, voz */
//   ytd-masthead #buttons ytd-topbar-menu-button-renderer { display: none !important; }
//   #notification-button { display: none !important; }
//   button[aria-label="Criar"] { display: none !important; }
//   button[aria-label="Notificações"] { display: none !important; }
//   #voice-search-button { display: none !important; }
//   #avatar-btn { display: none !important; }

//   /* Vídeos com Gostei */
//   ytd-guide-entry-renderer:has(a[href*="list=LL"]) { display: none !important; }

//   /* Explorar */
//   ytd-guide-entry-renderer:has(a[href="/feed/explore"]) { display: none !important; }
//   ytd-guide-section-renderer:has(a[href="/feed/explore"]) { display: none !important; }

//   /* Histórico de denúncias */
//   ytd-guide-entry-renderer:has(a[href="/reporthistory"]) { display: none !important; }

//   /* Mini sidebar (quando fechada) */
//   ytd-mini-guide-entry-renderer:has(a[title="Shorts"]) { display: none !important; }
//   ytd-mini-guide-entry-renderer:has(a[href="/feed/subscriptions"]) { display: none !important; }
//   ytd-mini-guide-entry-renderer:has(a[href="/feed/you"]) { display: none !important; }

//   /* Descrição */
//   #description-inner { display: none !important; }
//   #bottom-row { display: none !important; }

//   /* Comentários */
//   ytd-comments { display: none !important; }

//   /* Inscrever-se e contagem de inscritos */
//   #subscribe-button { display: none !important; }
//   #owner-sub-count { display: none !important; }

//   /* Compartilhar e botão ... (menu de ações) */
//   #actions { display: none !important; }

//   /* Shorts - todas as variações */
//   ytd-rich-section-renderer:has(a[href="/shorts"]) { display: none !important; }
//   ytd-reel-shelf-renderer { display: none !important; }
//   ytd-rich-shelf-renderer:has(a[href="/shorts"]) { display: none !important; }
//   ytd-rich-item-renderer:has(a[href*="/shorts/"]) { display: none !important; }
//   [is-shorts] { display: none !important; }

//   /* Cards de eventos/ingressos */
//   ytd-event-details-renderer { display: none !important; }
//   ytd-merch-shelf-renderer { display: none !important; }
//   ytd-ticket-shelf-renderer { display: none !important; }

//   /* Logo do YouTube na topbar */
//   #logo { display: none !important; }
//   ytd-topbar-logo-renderer { display: none !important; }
//   #center { display: none !important; }

//   /* Slots de anúncio no feed */
//   ytd-ad-slot-renderer { display: none !important; }
//   ytd-rich-item-renderer:has(ytd-ad-slot-renderer) { display: none !important; }

//   /* Player de anúncio — esconde overlay enquanto o script não pula */
//   .ytp-ad-overlay-container { display: none !important; }
//   .ytp-ad-text-overlay { display: none !important; }

//    /* ── Ads no feed/menu ── */
//   /* Card de anúncio disfarçado de vídeo */
//   ytd-rich-item-renderer:has([aria-label*="Patrocinado"]),
//   ytd-rich-item-renderer:has([aria-label*="Sponsored"]) { display: none !important; }

//   /* Shelf de anúncio */
//   ytd-rich-shelf-renderer:has(ytd-ad-slot-renderer) { display: none !important; }

//   /* Overlay de anúncio no player — esconde até o script pular */
//   .ytp-ad-player-overlay,
//   .ytp-ad-player-overlay-instream-info,
//   .ytp-ad-preview-container,
//   .ytp-ad-preview-text,
//   .ytp-ad-badge,
//   .ytp-ad-progress,
//   .ytp-ad-progress-list { display: none !important; }

//   /* Tela preta durante carregamento do ad */
//   .ytp-ad-module { display: none !important; }

//   /* Painel lateral de anúncios */
//   #related #player-ads { display: none !important; }
//   ytd-item-section-renderer:has(ytd-ad-slot-renderer) { display: none !important; }


//   /* Primeiro card de ad no feed */
//   /* Remove qualquer item que contenha um display-ad-renderer */
//   ytd-rich-item-renderer:has(ytd-display-ad-renderer) { display: none !important; }
//   ytd-display-ad-renderer { display: none !important; }

//   /* Remove banner de anúncio no topo da página inicial */
//   ytd-banner-promo-renderer { display: none !important; }
//   ytd-statement-banner-renderer { display: none !important; }

//   /* ── Remove botão de login da topbar ── */
//   #buttons a[href*="ServiceLogin"] { display: none !important; }
//   /* ou, se necessário, o container inteiro */
//   #buttons ytd-button-renderer:has(a[href*="ServiceLogin"]) { display: none !important; }

//   /* ── Remove bloco "Faça login para curtir..." da sidebar ── */
//   ytd-guide-signin-promo-renderer { display: none !important; }

//   /* ── (Opcional) Remove o link "Pular navegação" (acessibilidade) ── */
//   #skip-navigation { display: none !important; }
// `;

// export const SKIP_ADS_SCRIPT = `
// (function () {
//   'use strict';
 
//   // ── Limpeza de instâncias anteriores ──────────────────────────
//   if (window.__yt_ad_observer)  { window.__yt_ad_observer.disconnect(); }
//   if (window.__yt_ad_interval)  { clearInterval(window.__yt_ad_interval); }
//   if (window.__yt_ad_raf)       { cancelAnimationFrame(window.__yt_ad_raf); }
 
//   // ── 1. Intercepta fetch + XHR para remover adPlacements ───────
//   // Faz isso UMA vez por contexto de página (flag na window real)
//   if (!window.__yt_net_patched) {
//     window.__yt_net_patched = true;
 
//     // — fetch —
//     const _origFetch = window.fetch.bind(window);
//     window.fetch = async function (...args) {
//       const req = args[0];
//       const url = typeof req === 'string' ? req : req?.url ?? '';
//       const res = await _origFetch(...args);
 
//       if (url.includes('/youtubei/v1/player')) {
//         try {
//           const clone = res.clone();
//           // Só tenta parsear se Content-Encoding não for gzip (já decodificado pelo browser)
//           const text = await clone.text();
//           const json = JSON.parse(text);
 
//           // Remove TODOS os nós relacionados a ads
//           const AD_KEYS = [
//             'adPlacements','playerAds','adSlots',
//             'adBreakHeartbeatParams','adBreakParams',
//             'adMessagesRenderer','adPlacementConfig',
//           ];
//           AD_KEYS.forEach(k => delete json[k]);
 
//           return new Response(JSON.stringify(json), {
//             status: res.status,
//             statusText: res.statusText,
//             headers: new Headers({
//               'Content-Type': 'application/json',
//             }),
//           });
//         } catch {
//           return res; // Fallback seguro
//         }
//       }
//       return res;
//     };
 
//     // — XMLHttpRequest (fallback para fluxos mais antigos do YT) —
//     const _origOpen  = XMLHttpRequest.prototype.open;
//     const _origSend  = XMLHttpRequest.prototype.send;
 
//     XMLHttpRequest.prototype.open = function (method, url, ...rest) {
//       this.__ytUrl = url;
//       return _origOpen.call(this, method, url, ...rest);
//     };
 
//     XMLHttpRequest.prototype.send = function (...args) {
//       if (this.__ytUrl && this.__ytUrl.includes('/youtubei/v1/player')) {
//         this.addEventListener('readystatechange', function () {
//           if (this.readyState !== 4) return;
//           try {
//             // Sobrescreve responseText via defineProperty
//             const json = JSON.parse(this.responseText);
//             const AD_KEYS = [
//               'adPlacements','playerAds','adSlots',
//               'adBreakHeartbeatParams','adBreakParams',
//             ];
//             AD_KEYS.forEach(k => delete json[k]);
//             const clean = JSON.stringify(json);
//             Object.defineProperty(this, 'responseText', { get: () => clean, configurable: true });
//             Object.defineProperty(this, 'response',     { get: () => clean, configurable: true });
//           } catch { /* ignora se não for JSON */ }
//         });
//       }
//       return _origSend.apply(this, args);
//     };
//   }
 
//   // ── 2. Pula / encerra anúncio de vídeo ────────────────────────
//   function skipVideoAd() {
//     const video = document.querySelector('video');
//     if (!video) return;
 
//     // Botão de pular (pre-roll pulável)
//     const skipBtn = document.querySelector(
//       '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern'
//     );
//     if (skipBtn) {
//       skipBtn.click();
//       return;
//     }
 
//     // Ad em reprodução (bumper 6s ou não pulável)
//     const adShowing = document.querySelector(
//       '.ad-showing, .ytp-ad-player-overlay'
//     );
//     if (adShowing && video.duration > 0 && isFinite(video.duration)) {
//       // Muta para não irritar o usuário e avança para o fim
//       video.volume = 0;
//       video.muted  = true;
//       video.playbackRate = 16; // acelera ao máximo suportado
//       // Só pula direto se for bumper (duração <= 7s) ou se não houver botão de pular
//       if (video.duration <= 7) {
//         video.currentTime = video.duration;
//       } else {
//         // Pre-roll longo sem botão ainda: aguarda botão de skip aparecer
//         // (o observer vai chamar skipVideoAd() quando o botão surgir)
//       }
//     }
//   }
 
//   // ── 3. Remove overlays de ad (banner sobre o vídeo) ──────────
//   const OVERLAY_SELECTORS = [
//     '.ytp-ad-overlay-container',
//     '.ytp-ad-text-overlay',
//     '.ytp-ad-player-overlay-instream-info',
//     '.ytp-ad-preview-container',
//     '.ytp-ad-image-overlay',
//     '.ytp-ce-element',            // cards do YouTube
//   ];
 
//   function removeOverlays() {
//     OVERLAY_SELECTORS.forEach(sel => {
//       document.querySelectorAll(sel).forEach(el => el.remove());
//     });
//   }
 
//   // ── 4. Observer focado no player (não no documento inteiro) ───
//   function attachObserver() {
//     const player = document.querySelector('#movie_player, ytd-player');
//     const target = player ?? document.body;
 
//     window.__yt_ad_observer = new MutationObserver(() => {
//       skipVideoAd();
//       removeOverlays();
//     });
 
//     window.__yt_ad_observer.observe(target, {
//       childList: true,
//       subtree:   true,
//       attributes: true,
//       attributeFilter: ['class', 'src'],
//     });
//   }
 
//   // ── 5. Loop de segurança (cobre casos que o observer perde) ───
//   window.__yt_ad_interval = setInterval(() => {
//     skipVideoAd();
//     removeOverlays();
//   }, 300); // 300ms é suficiente e menos agressivo que 100ms
 
//   // ── 6. rAF para reagir no mesmo frame que o ad aparece ────────
//   let _rafSkip = false;
//   function rafLoop() {
//     if (!_rafSkip) {
//       const adShowing = document.querySelector('.ad-showing');
//       if (adShowing) {
//         skipVideoAd();
//         removeOverlays();
//       }
//     }
//     window.__yt_ad_raf = requestAnimationFrame(rafLoop);
//   }
//   window.__yt_ad_raf = requestAnimationFrame(rafLoop);
 
//   // ── 7. Reatача o observer quando o SPA navega para outro vídeo
//   document.addEventListener('yt-navigate-finish', () => {
//     if (window.__yt_ad_observer) window.__yt_ad_observer.disconnect();
//     // Aguarda o player re-montar (SPA)
//     setTimeout(() => {
//       attachObserver();
//       skipVideoAd();
//     }, 500);
//   });
 
//   // Inicialização imediata
//   attachObserver();
//   skipVideoAd();
//   removeOverlays();
 
//   console.log('[YT-AdSkip] inicializado');
// })();
// `;
 
 
// // ─────────────────────────────────────────────────────────────────
// // CUSTOM_CSS  —  acrescenta ao que você já tem
// // Cole estas regras no seu CUSTOM_CSS existente
// // ─────────────────────────────────────────────────────────────────
// export const ADDITIONAL_AD_CSS = `
//   /* ── Video ads: esconde tudo relacionado ao player de ad ──── */
//   .ytp-ad-player-overlay,
//   .ytp-ad-player-overlay-instream-info,
//   .ytp-ad-player-overlay-skip-or-preview,
//   .ytp-ad-preview-container,
//   .ytp-ad-preview-text-container,
//   .ytp-ad-badge,
//   .ytp-ad-progress,
//   .ytp-ad-progress-list,
//   .ytp-ad-simple-ad-badge,
//   .ytp-ad-persistent-progress-bar-container,
//   .ytp-ad-text-overlay,
//   .ytp-ad-overlay-container,
//   .ytp-ad-image-overlay,
//   .ytp-ad-module,
//   /* Cards e info-cards sobre o vídeo */
//   .ytp-ce-element,
//   .ytp-cards-teaser,
//   /* Painel "Próximo" que aparece durante ad */
//   .ytp-upnext-autoplay-icon,
//   /* Overlay de "Saiba mais" */
//   .ytp-ad-clickable-action-companion,
//   .ytp-ad-action-interstitial { display: none !important; }
 
//   /* ── Feed: remove cards patrocinados ──────────────────────── */
//   ytd-ad-slot-renderer,
//   ytd-display-ad-renderer,
//   ytd-banner-promo-renderer,
//   ytd-statement-banner-renderer,
//   ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
//   ytd-rich-item-renderer:has(ytd-display-ad-renderer),
//   ytd-rich-shelf-renderer:has(ytd-ad-slot-renderer),
//   ytd-item-section-renderer:has(ytd-ad-slot-renderer),
//   /* Patrocinado em pt-BR e en */
//   ytd-rich-item-renderer:has([aria-label*="Patrocinado"]),
//   ytd-rich-item-renderer:has([aria-label*="Sponsored"]),
//   ytd-compact-promoted-item-renderer { display: none !important; }
 
//   /* ── Sidebar de anúncios ──────────────────────────────────── */
//   #related #player-ads,
//   ytd-watch-next-secondary-results-renderer #player-ads { display: none !important; }
// `;