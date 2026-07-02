// src/renderer/hooks/useSearchHandlers.js
import { useState, useRef, useCallback } from "react";

// ============================================================================
// Constantes e Helpers
// ============================================================================

export const DOWNLOAD_TYPES = {
  VIDEO: "video",
  AUDIO: "audio",
};

// Qualidades disponíveis para download de mix (vídeo)
export const MIX_VIDEO_QUALITIES = [
  {
    label: "Melhor qualidade (4K se disponível)",
    value: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]",
  },
  {
    label: "1080p",
    value:
      "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]",
  },
  {
    label: "720p",
    value:
      "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]",
  },
  {
    label: "480p",
    value:
      "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]",
  },
];

// Qualidades disponíveis para download de mix (áudio)
export const MIX_AUDIO_QUALITIES = [
  { label: "Melhor qualidade (m4a)", value: "bestaudio[ext=m4a]/bestaudio" },
  { label: "128 kbps (mp3)", value: "bestaudio[abr<=128]/bestaudio" },
];

/**
 * Extrai informações de mix do YouTube a partir da URL
 * @param {string} url - URL do YouTube
 * @returns {{ videoId: string, playlistId: string } | null}
 */
function parseMixFromUrl(url) {
  try {
    const u = new URL(url);
    const list = u.searchParams.get("list");
    const videoId = u.searchParams.get("v");

    if (!list) return null;
    if (list.startsWith("FL")) return null; // favoritos antigos, sem suporte

    // WL = Assistir mais tarde, LL = Vídeos curtidos — são privadas, scraping via webview
    const isPrivate = list === "WL" || list === "LL" || list.startsWith("RD");

    return { videoId: videoId ?? null, playlistId: list, isPrivate };
  } catch {
    return null;
  }
}

// ============================================================================
// Hook principal
// ============================================================================

/**
 * Hook para gerenciar navegação, busca, download e autenticação do YouTube
 * @param {Object} options
 * @param {Function} options.setSearchUrl - Atualiza URL de busca externa
 * @param {Function} options.setScreen - Alterna entre telas (opcional)
 */
export function useSearchHandlers({ setSearchUrl, setScreen, toast } = {}) {
  // --------------------------------------------------------------------------
  // Refs
  // --------------------------------------------------------------------------
  const webviewRef = useRef(null);
  const inputRef = useRef(null);
  const queryRef = useRef("");

  // --------------------------------------------------------------------------
  // Estados de Navegação
  // --------------------------------------------------------------------------
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // --------------------------------------------------------------------------
  // Estados de Busca
  // --------------------------------------------------------------------------
  const [query, setQuery] = useState("");

  // --------------------------------------------------------------------------
  // Estados de Download
  // --------------------------------------------------------------------------
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [videoFormats, setVideoFormats] = useState([]);
  const [audioFormats, setAudioFormats] = useState([]);
  const [selectedFormatId, setSelectedFormatId] = useState(null);
  const [downloadType, setDownloadType] = useState(DOWNLOAD_TYPES.VIDEO);
  const [fetchingFormats, setFetchingFormats] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState("");
  const [currentVideoTitle, setCurrentVideoTitle] = useState("");

  // --------------------------------------------------------------------------
  // Estados de Mix
  // --------------------------------------------------------------------------
  const [mixInfo, setMixInfo] = useState(null); // { playlistId, title, count } | null
  const [mixMode, setMixMode] = useState("single"); // 'single' ou 'mix'
  const [mixVideos, setMixVideos] = useState([]); // Array de { id, title, selected }
  const [loadingMixVideos, setLoadingMixVideos] = useState(false);
  const [mixQuality, setMixQuality] = useState(MIX_VIDEO_QUALITIES[0].value); // qualidade para mix

  // --------------------------------------------------------------------------
  // Estados de Autenticação
  // --------------------------------------------------------------------------
  const [showLoginModal, setShowLoginModal] = useState(false);

  // ==========================================================================
  // Helpers síncronos
  // ==========================================================================

  const YT_SEARCH_BASE = "https://www.youtube.com/results";

  /**
   * Mantém queryRef sincronizado com o estado query
   */
  const setQuerySynced = useCallback((val) => {
    queryRef.current = val;
    setQuery(val);
  }, []);

  /**
   * Extrai o ID do vídeo da URL atual do webview
   */
  const extractVideoId = useCallback(() => {
    const wv = webviewRef.current;
    if (!wv) return null;
    const currentUrl = wv.getURL();
    if (!currentUrl) return null;
    const match = currentUrl.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  }, []);

  // ==========================================================================
  // Navegação do Webview
  // ==========================================================================

  const updateNavState = useCallback(() => {
    const wv = webviewRef.current;
    if (!wv || typeof wv.canGoBack !== "function") return;
    setCanGoBack(wv.canGoBack());
    setCanGoForward(wv.canGoForward());
  }, []);

  const handleGoBack = useCallback(() => {
    if (webviewRef.current?.canGoBack()) webviewRef.current.goBack();
  }, []);

  const handleGoForward = useCallback(() => {
    if (webviewRef.current?.canGoForward()) webviewRef.current.goForward();
  }, []);

  const handleReload = useCallback(() => {
    webviewRef.current?.reload();
  }, []);

  // ==========================================================================
  // Busca
  // ==========================================================================

  const handleSearch = useCallback(() => {
    const q = queryRef.current.trim();
    if (!q) return;
    const url = `${YT_SEARCH_BASE}?search_query=${encodeURIComponent(q)}`;
    const wv = webviewRef.current;
    if (!wv) return;
    if (typeof wv.loadURL === "function") {
      wv.loadURL(url);
    } else {
      wv.src = url;
    }
    setSearchUrl?.(url);
  }, [setSearchUrl]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch],
  );

  const clearQuery = useCallback(() => {
    setQuery("");
    inputRef.current?.focus();
  }, []);

  // ==========================================================================
  // Modal de Download - Abertura e fechamento
  // ==========================================================================

  const closeDownloadModal = useCallback(() => {
    setShowDownloadModal(false);
    setVideoFormats([]);
    setAudioFormats([]);
    setSelectedFormatId(null);
    setDownloadType(DOWNLOAD_TYPES.VIDEO);
    setDownloading(false);
    setMixInfo(null);
    setMixMode("single");
    setMixVideos([]);
    setLoadingMixVideos(false);
    setMixQuality(MIX_VIDEO_QUALITIES[0].value); // reseta qualidade padrão
  }, []);

  const openDownloadModal = useCallback(
    async () => {
      const videoId = extractVideoId();
      if (!videoId) {
        toast?.({
          message: "Navegue até um vídeo do YouTube primeiro.",
          type: "error",
        });
        return;
      }

      const wv = webviewRef.current;
      const currentUrl = wv.getURL();
      console.log("URL atual do webview:", currentUrl);

      // Tenta obter título da página
      let title = "video";
      try {
        const pageTitle = await wv.executeJavaScript("document.title");
        title = pageTitle.replace(/ - YouTube$/, "").trim();
      } catch {}

      setCurrentVideoId(videoId);
      setCurrentVideoTitle(title);
      setShowDownloadModal(true);
      setFetchingFormats(true);
      setSelectedFormatId(null);
      setDownloadType(DOWNLOAD_TYPES.VIDEO);
      setMixInfo(null);
      setMixMode("single");
      setMixVideos([]);
      setMixQuality(MIX_VIDEO_QUALITIES[0].value); // padrão vídeo

      const mix = parseMixFromUrl(currentUrl);

      try {
        const [formatsRes, mixRes] = await Promise.all([
          window.electronAPI.youtube.getVideoFormats(videoId),
          mix
            ? window.electronAPI.youtube.getMixInfo({
                videoId: mix.videoId,
                playlistId: mix.playlistId,
              })
            : Promise.resolve(null),
        ]);

        const video = Array.isArray(formatsRes?.video) ? formatsRes.video : [];
        const audio = Array.isArray(formatsRes?.audio) ? formatsRes.audio : [];
        console.log("toast disponível:", typeof toast);
        setVideoFormats(video);
        setAudioFormats(audio);
        if (video.length > 0) setSelectedFormatId(video[0].id);

        if (mix && mixRes) {
          setMixInfo({
            playlistId: mix.playlistId,
            isPrivate: mix.isPrivate,
            title: mixRes.title ?? "Mix",
            count: mix.playlistId.startsWith("RD")
              ? null
              : (mixRes.count ?? null),
          });
        }
      } catch (err) {
        console.error("Erro ao buscar formatos:", err);
        toast?.({
          message: "Erro ao buscar qualidades. Tente novamente.",
          type: "error",
        });
      } finally {
        setFetchingFormats(false);
      }
    },
    [extractVideoId],
    toast,
  );

  // ==========================================================================
  // Download - Seleção e ações
  // ==========================================================================

  const handleChangeDownloadType = useCallback(
    (type) => {
      setDownloadType(type);
      if (type === DOWNLOAD_TYPES.VIDEO) {
        setSelectedFormatId(videoFormats[0]?.id ?? null);
        setMixQuality(MIX_VIDEO_QUALITIES[0].value);
      } else {
        setSelectedFormatId(audioFormats[0]?.id ?? null);
        setMixQuality(MIX_AUDIO_QUALITIES[0].value);
      }
    },
    [videoFormats, audioFormats],
  );

  /**
   * Altera o modo de download (vídeo único ou mix completa)
   * Quando muda para "mix", carrega a lista de vídeos se ainda não estiver carregada.
   */
  const handleSetMixMode = useCallback(
    async (mode) => {
      setMixMode(mode);

      if (mode === "mix" && mixInfo && mixVideos.length === 0) {
        setLoadingMixVideos(true);
        try {
          const isPrivate = mixInfo.isPrivate; // RD, WL, LL

          if (isPrivate) {
            // Extrai vídeos do painel lateral do webview
            const extracted = await webviewRef.current.executeJavaScript(`
              (() => {
                // Tenta painel lateral (Mix/RD) primeiro
                const panelItems = document.querySelectorAll('ytd-playlist-panel-video-renderer');
                if (panelItems.length > 0) {
                  return Array.from(panelItems).map((el, index) => {
                    const titleEl = el.querySelector('#video-title');
                    const linkEl = el.querySelector('a#wc-endpoint');
                    const href = linkEl?.href || '';
                    const urlParams = new URLSearchParams(href.split('?')[1] || '');
                    return {
                      index: index + 1,
                      id: urlParams.get('v') || '',
                      title: titleEl?.textContent?.trim() || 'Vídeo ' + (index + 1),
                    };
                  }).filter(v => v.id);
                }

                // Fallback: página de playlist (WL, LL) — ytd-playlist-video-renderer
                const pageItems = document.querySelectorAll('ytd-playlist-video-renderer');
                return Array.from(pageItems).map((el, index) => {
                  const titleEl = el.querySelector('#video-title');
                  const linkEl = el.querySelector('a#wc-endpoint, a[href*="watch"]');
                  const href = linkEl?.href || '';
                  const urlParams = new URLSearchParams(href.split('?')[1] || '');
                  return {
                    index: index + 1,
                    id: urlParams.get('v') || '',
                    title: titleEl?.textContent?.trim() || 'Vídeo ' + (index + 1),
                  };
                }).filter(v => v.id);
              })()
            `);

            if (extracted?.length > 0) {
              setMixVideos(extracted.map((v) => ({ ...v, selected: true })));
              setMixInfo((prev) => ({ ...prev, count: extracted.length }));
            } else {
              toast?.({
                message:
                  "Não foi possível carregar os vídeos. Abra a playlist no YouTube primeiro.",
                type: "error",
              });
            }
          } else {
            // Playlist pública normal: usa yt-dlp via IPC
            const res = await window.electronAPI.youtube.getMixVideos({
              videoId: currentVideoId,
              playlistId: mixInfo.playlistId,
            });
            if (res.success) {
              setMixVideos(res.videos.map((v) => ({ ...v, selected: true })));
            }
          }
        } catch (err) {
          console.error("Erro ao buscar vídeos da mix:", err);
          toast?.({ message: "Erro ao carregar vídeos.", type: "error" });
        } finally {
          setLoadingMixVideos(false);
        }
      }
    },
    [mixInfo, mixVideos.length, currentVideoId, webviewRef, toast],
  );

  /**
   * Alterna seleção de um vídeo individual na mix
   */
  const toggleMixVideo = useCallback((id) => {
    setMixVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, selected: !v.selected } : v)),
    );
  }, []);

  /**
   * Marca/desmarca todos os vídeos da mix
   */
  const toggleAllMixVideos = useCallback((selected) => {
    setMixVideos((prev) => prev.map((v) => ({ ...v, selected })));
  }, []);

  const handleStartDownload = useCallback(async () => {
    if (!currentVideoId) return;

    try {
      let invokePromise;
      const isMixDownload = mixInfo && mixMode === "mix";

      if (isMixDownload) {
        const selected = mixVideos.filter((v) => v.selected);
        const selectedIds = selected.map((v) => v.id);
        const selectedTitles = selected.map((v) => v.title);

        if (selectedIds.length === 0) {
          toast?.({
            message: "Selecione pelo menos um vídeo da mix.",
            type: "error",
          });
          return;
        }

        invokePromise = window.electronAPI.youtube.downloadMix({
          videoId: currentVideoId,
          playlistId: mixInfo.playlistId,
          title: mixInfo.title,
          mode: "mix",
          format: downloadType,
          formatString: mixQuality,
          videoIds: selectedIds,
          videoTitles: selectedTitles,
        });
      } else if (downloadType === DOWNLOAD_TYPES.AUDIO) {
        invokePromise = window.electronAPI.youtube.downloadAudio({
          videoId: currentVideoId,
          title: currentVideoTitle,
          formatId: selectedFormatId,
        });
      } else {
        if (!selectedFormatId) return;
        invokePromise = window.electronAPI.youtube.downloadVideo({
          videoId: currentVideoId,
          title: currentVideoTitle,
          formatId: selectedFormatId,
        });
      }

      // Não espera o download terminar — só confirma que foi disparado.
      // Erros de "falha ao iniciar" ainda aparecem; falhas durante o
      // download em si chegam pelo evento download:error (useDownloadQueue).
      invokePromise.catch((err) => {
        toast?.({ message: "Erro ao baixar: " + err.message, type: "error" });
      });

      closeDownloadModal(); // fecha na hora, libera a UI pro próximo download
    } catch (err) {
      toast?.({ message: "Erro ao baixar: " + err.message, type: "error" });
    }
  }, [
    downloadType,
    selectedFormatId,
    currentVideoId,
    currentVideoTitle,
    mixInfo,
    mixMode,
    mixVideos,
    mixQuality,
    closeDownloadModal,
    toast,
  ]);

  // ==========================================================================
  // Autenticação Google
  // ==========================================================================

  const handleLogin = useCallback(async () => {
    try {
      const success = await window.electronAPI.googleLoginExternal();
      if (!success) return; // usuário fechou a janela sem logar

      await window.electronAPI.googleImportCookies();

      if (webviewRef.current) {
        // Tempo para cookies serem persistidos antes do reload
        await new Promise((r) => setTimeout(r, 1000));
        webviewRef.current.loadURL("https://www.youtube.com");
      }

      setIsLoggedIn(true);
    } catch (err) {
      if (!err?.message?.includes("ERR_ABORTED")) {
        console.error("Erro no login:", err);
      }
    }
  }, []);

  const handleLoginDone = useCallback(async () => {
    await window.electronAPI.googleImportCookies(); // já copia para cookies.txt

    // Recarrega o webview — os cookies já estão na persist:youtube após o import
    setShowLoginModal(false);
    await new Promise((r) => setTimeout(r, 300));
    webviewRef.current?.reload();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await window.electronAPI.googleLogout();
      setIsLoggedIn(false);
      if (webviewRef.current) {
        webviewRef.current.src = "https://www.youtube.com";
      }
    } catch (err) {
      console.error("Erro no logout:", err);
    }
  }, []);

  // ==========================================================================
  // Retorno do hook
  // ==========================================================================

  return {
    // Refs
    webviewRef,
    inputRef,

    // Navegação
    canGoBack,
    canGoForward,
    updateNavState,
    handleGoBack,
    handleGoForward,
    handleReload,

    // Busca
    query,
    setQuery: setQuerySynced,
    clearQuery,
    handleSearch,
    handleKeyDown,

    // Download - Modal
    showDownloadModal,
    videoFormats,
    audioFormats,
    selectedFormatId,
    setSelectedFormatId,
    downloadType,
    handleChangeDownloadType,
    fetchingFormats,
    downloading,
    openDownloadModal,
    closeDownloadModal,
    handleStartDownload,

    // Mix - informações e seleção
    mixInfo,
    mixMode,
    setMixMode: handleSetMixMode,
    mixVideos,
    loadingMixVideos,
    toggleMixVideo,
    toggleAllMixVideos,
    mixQuality,
    setMixQuality,
    MIX_VIDEO_QUALITIES,
    MIX_AUDIO_QUALITIES,
    mixQuality,
    setMixQuality,

    // Autenticação
    isLoggedIn,
    setIsLoggedIn,
    showLoginModal,
    handleLogin,
    handleLoginDone,
    handleLogout,
  };
}
