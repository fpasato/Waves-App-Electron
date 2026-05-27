import { useState, useRef, useCallback } from "react";

// Tipos de download disponíveis no modal
export const DOWNLOAD_TYPES = {
  VIDEO: "video",
  AUDIO: "audio",
};

/**
 * useSearchHandlers
 * Centraliza todos os handlers do SearchScreen agrupados por domínio:
 *  - navegação do webview (goBack, goForward, reload)
 *  - busca (handleSearch, handleKeyDown)
 *  - download (openDownloadModal, closeDownloadModal, handleStartDownload)
 *  - autenticação (handleLogin, handleLoginDone, handleLogout)
 */
export function useSearchHandlers({ setSearchUrl, setScreen } = {}) {
  const webviewRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Estado de navegação ────────────────────────────────────────────────────
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const updateNavState = useCallback(() => {
    const wv = webviewRef.current;
    if (!wv || typeof wv.canGoBack !== "function") return;
    setCanGoBack(wv.canGoBack());
    setCanGoForward(wv.canGoForward());
  }, []);

  // ─── Estado de busca ────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");

  const YT_SEARCH_BASE = "https://www.youtube.com/results";

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    const url = `${YT_SEARCH_BASE}?search_query=${encodeURIComponent(query.trim())}`;
    if (webviewRef.current) {
      webviewRef.current.src = url;
      setSearchUrl?.(url);
    }
  }, [query, setSearchUrl]);

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

  // ─── Handlers de navegação do webview ──────────────────────────────────────
  const handleGoBack = useCallback(() => {
    if (webviewRef.current?.canGoBack()) webviewRef.current.goBack();
  }, []);

  const handleGoForward = useCallback(() => {
    if (webviewRef.current?.canGoForward()) webviewRef.current.goForward();
  }, []);

  const handleReload = useCallback(() => {
    webviewRef.current?.reload();
  }, []);

  // ─── Estado e handlers de download ─────────────────────────────────────────
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [videoFormats, setVideoFormats] = useState([]);
  const [audioFormats, setAudioFormats] = useState([]);
  const [selectedFormatId, setSelectedFormatId] = useState(null);
  // "video" | "audio" — controla qual aba está ativa no modal
  const [downloadType, setDownloadType] = useState(DOWNLOAD_TYPES.VIDEO);
  const [fetchingFormats, setFetchingFormats] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState("");
  const [currentVideoTitle, setCurrentVideoTitle] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const extractVideoId = useCallback(() => {
    const wv = webviewRef.current;
    if (!wv) return null;
    const currentUrl = wv.getURL();
    if (!currentUrl) return null;
    const match = currentUrl.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  }, []);

  const openDownloadModal = useCallback(async () => {
    const videoId = extractVideoId();
    if (!videoId) {
      alert("Navegue até um vídeo do YouTube primeiro.");
      return;
    }

    const wv = webviewRef.current;
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

    try {
      const res = await window.electronAPI.youtube.getVideoFormats(videoId);

      const video = Array.isArray(res?.video) ? res.video : [];
      const audio = Array.isArray(res?.audio) ? res.audio : [];

      setVideoFormats(video);
      setAudioFormats(audio);

      // Pré-seleciona o primeiro formato de vídeo
      if (video.length > 0) setSelectedFormatId(video[0].id);
    } catch (err) {
      console.error("Erro ao buscar formatos:", err);
      alert("Erro ao buscar qualidades. Tente novamente.");
    } finally {
      setFetchingFormats(false);
    }
  }, [extractVideoId]);

  const closeDownloadModal = useCallback(() => {
    setShowDownloadModal(false);
    setVideoFormats([]);
    setAudioFormats([]);
    setSelectedFormatId(null);
    setDownloadType(DOWNLOAD_TYPES.VIDEO);
    setDownloading(false);
  }, []);

  // Troca de aba (vídeo / áudio) e ajusta a seleção automaticamente
  const handleChangeDownloadType = useCallback(
    (type) => {
      setDownloadType(type);
      if (type === DOWNLOAD_TYPES.VIDEO) {
        setSelectedFormatId(videoFormats[0]?.id ?? null);
      } else {
        setSelectedFormatId(audioFormats[0]?.id ?? null);
      }
    },
    [videoFormats, audioFormats],
  );

  const handleStartDownload = useCallback(async () => {
    if (!currentVideoId) return;
    setDownloading(true);

    try {
      let result;

      if (downloadType === DOWNLOAD_TYPES.AUDIO) {
        result = await window.electronAPI.youtube.downloadAudio({
          videoId: currentVideoId,
          title: currentVideoTitle,
          formatId: selectedFormatId, // formato de áudio selecionado
        });
      } else {
        // Download de vídeo com formato selecionado
        if (!selectedFormatId) return;
        result = await window.electronAPI.youtube.downloadVideo({
          videoId: currentVideoId,
          title: currentVideoTitle,
          formatId: selectedFormatId,
        });
      }

      if (result.success) {
        alert(`Download concluído!\nSalvo em: ${result.path}`);
        closeDownloadModal();
      } else {
        alert("Falha no download: " + (result.error || "Erro desconhecido"));
      }
    } catch (err) {
      alert("Erro ao baixar: " + err.message);
    } finally {
      setDownloading(false);
    }
  }, [
    downloadType,
    selectedFormatId,
    currentVideoId,
    currentVideoTitle,
    closeDownloadModal,
  ]);

  // ─── Estado e handlers de autenticação ─────────────────────────────────────
  const [showLoginModal, setShowLoginModal] = useState(false);
  const handleLogin = useCallback(async () => {
    try {
      await window.electronAPI.googleLoginExternal();
      await window.electronAPI.googleImportCookies();

      if (webviewRef.current) {
        // Pequeno delay para os cookies serem persistidos antes do reload
        await new Promise((r) => setTimeout(r, 500));
        webviewRef.current.reload();
      }
    } catch (err) {
      // ERR_ABORTED é esperado durante o themeRefresh do YouTube — ignora
      if (!err?.message?.includes("ERR_ABORTED")) {
      }
    }
  }, [webviewRef]);

  const handleLoginDone = useCallback(async () => {
    await window.electronAPI.googleImportCookies();
    setShowLoginModal(false);
    webviewRef.current?.reload();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await window.electronAPI.googleLogout();
      setIsLoggedIn(false);

      // .src é a forma correta pra webview — não .loadURL()
      if (webviewRef.current) {
        webviewRef.current.src = "https://www.youtube.com";
      }
    } catch (err) {
      console.error("Erro no logout" );
    }
  }, [webviewRef]);

  // ─── Retorno agrupado ───────────────────────────────────────────────────────
  return {
    // refs
    webviewRef,
    inputRef,

    // navegação
    canGoBack,
    canGoForward,
    updateNavState,
    handleGoBack,
    handleGoForward,
    handleReload,

    // busca
    query,
    setQuery,
    clearQuery,
    handleSearch,
    handleKeyDown,

    // download
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

    // autenticação
    isLoggedIn,
    setIsLoggedIn,
    showLoginModal,
    handleLogin,
    handleLoginDone,
    handleLogout,
  };
}
