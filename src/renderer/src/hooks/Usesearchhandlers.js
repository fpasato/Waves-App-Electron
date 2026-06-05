// src/renderer/hooks/useSearchHandlers.js
import { useState, useRef, useCallback, useEffect } from "react";

export const DOWNLOAD_TYPES = {
  VIDEO: "video",
  AUDIO: "audio",
};

// ─── Helper: detecta mix pela URL ──────────────────────────────────────────
function parseMixFromUrl(url) {
  try {
    const u = new URL(url);
    const list = u.searchParams.get("list");
    const videoId = u.searchParams.get("v");
    // Mixes do YouTube: list começa com RD (Radio) ou RDMM
    if (list && list.startsWith("RD") && videoId) {
      return { videoId, playlistId: list };
    }
    return null;
  } catch {
    return null;
  }
}

export function useSearchHandlers({ setSearchUrl, setScreen } = {}) {
  const webviewRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Navegação ──────────────────────────────────────────────────────────────
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const updateNavState = useCallback(() => {
    const wv = webviewRef.current;
    if (!wv || typeof wv.canGoBack !== "function") return;
    setCanGoBack(wv.canGoBack());
    setCanGoForward(wv.canGoForward());
  }, []);

  // ─── Busca ──────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const queryRef = useRef(query);

  const setQuerySynced = useCallback((val) => {
    queryRef.current = val;
    setQuery(val);
  }, []);

  const YT_SEARCH_BASE = "https://www.youtube.com/results";

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

  // ─── Navegação do webview ───────────────────────────────────────────────────
  const handleGoBack = useCallback(() => {
    if (webviewRef.current?.canGoBack()) webviewRef.current.goBack();
  }, []);

  const handleGoForward = useCallback(() => {
    if (webviewRef.current?.canGoForward()) webviewRef.current.goForward();
  }, []);

  const handleReload = useCallback(() => {
    webviewRef.current?.reload();
  }, []);

  // ─── Download ───────────────────────────────────────────────────────────────
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [videoFormats, setVideoFormats] = useState([]);
  const [audioFormats, setAudioFormats] = useState([]);
  const [selectedFormatId, setSelectedFormatId] = useState(null);
  const [downloadType, setDownloadType] = useState(DOWNLOAD_TYPES.VIDEO);
  const [fetchingFormats, setFetchingFormats] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState("");
  const [currentVideoTitle, setCurrentVideoTitle] = useState("");

  // ─── Estado de mix ──────────────────────────────────────────────────────────
  // null = não é mix | { playlistId, title, count } = é mix
  const [mixInfo, setMixInfo] = useState(null);
  // 'single' = só o vídeo atual | 'mix' = playlist inteira
  const [mixMode, setMixMode] = useState("single");

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
    const currentUrl = wv.getURL();

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

    // ── Detecta mix e busca metadados em paralelo com os formatos ──
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

      setVideoFormats(video);
      setAudioFormats(audio);
      if (video.length > 0) setSelectedFormatId(video[0].id);

      if (mix && mixRes) {
        setMixInfo({
          playlistId: mix.playlistId,
          title: mixRes.title ?? "Mix",
          count: mixRes.count ?? null,
        });
        // Padrão: baixar só o vídeo atual — usuário escolhe no modal
        setMixMode("single");
      }
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
    setMixInfo(null);
    setMixMode("single");
  }, []);

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
      const isMixDownload = mixInfo && mixMode === "mix";

      if (isMixDownload) {
        // ── Baixar mix inteira ──────────────────────────────────────
        result = await window.electronAPI.youtube.downloadMix({
          videoId: currentVideoId,
          playlistId: mixInfo.playlistId,
          title: mixInfo.title,
          mode: "mix",
          format: downloadType, // 'video' | 'audio'
        });
      } else if (downloadType === DOWNLOAD_TYPES.AUDIO) {
        // ── Áudio individual ────────────────────────────────────────
        result = await window.electronAPI.youtube.downloadAudio({
          videoId: currentVideoId,
          title: currentVideoTitle,
          formatId: selectedFormatId,
        });
      } else {
        // ── Vídeo individual ────────────────────────────────────────
        if (!selectedFormatId) return;
        result = await window.electronAPI.youtube.downloadVideo({
          videoId: currentVideoId,
          title: currentVideoTitle,
          formatId: selectedFormatId,
        });
      }

      if (result.success) {
        alert(
          isMixDownload
            ? `Download da mix iniciado!\nOs arquivos serão salvos em: ${downloadType === "audio" ? "audios" : "video"}`
            : `Download concluído!\nSalvo em: ${result.path}`,
        );
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
    mixInfo,
    mixMode,
    closeDownloadModal,
  ]);

  // ─── Autenticação ───────────────────────────────────────────────────────────
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLogin = useCallback(async () => {
    try {
      await window.electronAPI.googleLoginExternal();
      await window.electronAPI.googleImportCookies();
      if (webviewRef.current) {
        await new Promise((r) => setTimeout(r, 500));
        webviewRef.current.reload();
      }
    } catch (err) {
      if (!err?.message?.includes("ERR_ABORTED")) {
        console.error("Erro no login:", err);
      }
    }
  }, []);

  const handleLoginDone = useCallback(async () => {
    await window.electronAPI.googleImportCookies();
    setShowLoginModal(false);
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

  // ─── Retorno ─────────────────────────────────────────────────────────────────
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
    setQuery: setQuerySynced,
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

    // mix
    mixInfo,       
    mixMode,      
    setMixMode,   

    // autenticação
    isLoggedIn,
    setIsLoggedIn,
    showLoginModal,
    handleLogin,
    handleLoginDone,
    handleLogout,
  };
}