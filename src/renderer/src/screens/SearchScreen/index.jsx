import { useEffect } from "react";
import styles from "./style.module.css";
import { CUSTOM_CSS, SKIP_ADS_SCRIPT } from "./customCss";
import {
  useSearchHandlers,
  DOWNLOAD_TYPES,
} from "../../hooks/Usesearchhandlers";

export function SearchScreen({ setScreen, searchUrl, setSearchUrl, onClose }) {
  const {
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
  } = useSearchHandlers({ setSearchUrl, setScreen });

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    let destroyed = false;

    const handleDomReady = async () => {
      if (destroyed || !wv.isConnected) return;

      // Pequeno delay para o webview estabilizar
      await new Promise((r) => setTimeout(r, 300));
      if (destroyed || !wv.isConnected) return;

      try {
        await wv.insertCSS(CUSTOM_CSS);
      } catch (e) {}

      try {
        await wv.executeJavaScript(
          `try { (${SKIP_ADS_SCRIPT})() } catch(e) {}`,
        );
      } catch (e) {}

      // Login check com delay maior
      setTimeout(async () => {
        if (destroyed || !wv.isConnected) return;
        try {
          const logged = await wv.executeJavaScript(
            `!!document.querySelector('button#avatar-btn')`,
          );
          if (!destroyed) setIsLoggedIn(logged);
        } catch (e) {}
      }, 2000);

      if (!destroyed) updateNavState();
    };

    const handleNavigate = () => {
      if (!destroyed) updateNavState();
    };

    wv.addEventListener("dom-ready", handleDomReady);
    wv.addEventListener("did-navigate", handleNavigate);
    wv.addEventListener("did-navigate-in-page", handleNavigate);

    return () => {
      destroyed = true;
      // Remove listeners apenas se o webview ainda estiver no DOM
      if (wv.isConnected) {
        wv.removeEventListener("dom-ready", handleDomReady);
        wv.removeEventListener("did-navigate", handleNavigate);
        wv.removeEventListener("did-navigate-in-page", handleNavigate);
      }
    };
  }, [updateNavState, setIsLoggedIn, webviewRef]);

  return (
    <div className={styles.searchScreen}>
      <div className={styles.searchHeader}>
        {/* Navegação */}
        <button
          className={styles.backBtn}
          onClick={() => setScreen("player")}
          title="Home"
        >
          🏠
        </button>
        <button className={styles.navBtn} onClick={onClose} title="Fechar">
          ✕
        </button>
        <button
          className={styles.navBtn}
          onClick={handleGoBack}
          disabled={!canGoBack}
          title="Voltar"
        >
          ←
        </button>
        <button
          className={styles.navBtn}
          onClick={handleGoForward}
          disabled={!canGoForward}
          title="Avançar"
        >
          →
        </button>
        <button
          className={styles.navBtn}
          onClick={handleReload}
          title="Recarregar"
        >
          ⟳
        </button>

        {/* Busca */}
        <div className={styles.searchInputWrapper}>
          <input
            ref={inputRef}
            className={styles.searchInput}
            type="text"
            placeholder="Buscar no YouTube..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              className={styles.clearBtn}
              onClick={clearQuery}
              aria-label="Limpar"
            >
              ✕
            </button>
          )}
        </div>
        <button
          className={styles.searchBtn}
          onClick={handleSearch}
          disabled={!query.trim()}
        >
          🔍
        </button>

        {/* Download */}
        <button
          className={styles.navBtn}
          onClick={openDownloadModal}
          title="Baixar vídeo"
        >
          ⬇️
        </button>

        {/* Auth */}
        <div className={styles.authWrapper}>
          {isLoggedIn ? (
            <button
              className={`${styles.authBtn} ${styles.logoutBtn}`}
              onClick={handleLogout}
            >
              Sair ↩
            </button>
          ) : (
            <button className={styles.authBtn} onClick={handleLogin}>
              Entrar com Google
            </button>
          )}

          {/* Modal: login */}
          {showLoginModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <p>
                  Faça login no browser que abriu e clique em continuar quando
                  terminar.
                </p>
                <button
                  className={styles.modalConfirmBtn}
                  onClick={handleLoginDone}
                >
                  Já fiz login ✓
                </button>
              </div>
            </div>
          )}

          {/* Modal: download */}
          {showDownloadModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3>Download</h3>

                {/* Abas Vídeo / Áudio */}
                <div className={styles.downloadTabs}>
                  <button
                    className={
                      downloadType === DOWNLOAD_TYPES.VIDEO
                        ? styles.tabActive
                        : styles.tab
                    }
                    onClick={() =>
                      handleChangeDownloadType(DOWNLOAD_TYPES.VIDEO)
                    }
                  >
                    🎬 Vídeo
                  </button>
                  <button
                    className={
                      downloadType === DOWNLOAD_TYPES.AUDIO
                        ? styles.tabActive
                        : styles.tab
                    }
                    onClick={() =>
                      handleChangeDownloadType(DOWNLOAD_TYPES.AUDIO)
                    }
                  >
                    🎵 Áudio (MP3)
                  </button>
                </div>

                {fetchingFormats ? (
                  <p>Carregando formatos...</p>
                ) : (
                  <>
                    {/* Lista de qualidades de vídeo */}
                    {downloadType === DOWNLOAD_TYPES.VIDEO && (
                      <>
                        {videoFormats.length === 0 ? (
                          <p>Nenhum formato de vídeo disponível.</p>
                        ) : (
                          videoFormats.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => setSelectedFormatId(f.id)}
                              style={{
                                display: "block",
                                margin: "5px 0",
                                fontWeight:
                                  selectedFormatId === f.id ? "bold" : "normal",
                              }}
                            >
                              {f.resolution}
                            </button>
                          ))
                        )}
                      </>
                    )}

                    {/* Áudio: lista por kbps */}
                    {downloadType === DOWNLOAD_TYPES.AUDIO && (
                      <>
                        {audioFormats.length === 0 ? (
                          <p>Nenhum formato de áudio disponível.</p>
                        ) : (
                          audioFormats.map((f) => {
                            const kbps = f.abr
                              ? `${Math.round(f.abr)} kbps`
                              : "? kbps";
                            const size = f.filesize
                              ? `${(f.filesize / 1024 / 1024).toFixed(1)} MB`
                              : "";
                            const label = [f.ext?.toUpperCase(), kbps, size]
                              .filter(Boolean)
                              .join(" · ");
                            return (
                              <button
                                key={f.id}
                                onClick={() => setSelectedFormatId(f.id)}
                                style={{
                                  display: "block",
                                  margin: "5px 0",
                                  fontWeight:
                                    selectedFormatId === f.id
                                      ? "bold"
                                      : "normal",
                                }}
                              >
                                {label}
                              </button>
                            );
                          })
                        )}
                        <small style={{ opacity: 0.6 }}>
                          Será convertido para MP3
                        </small>
                      </>
                    )}

                    <button
                      onClick={handleStartDownload}
                      disabled={downloading || !selectedFormatId}
                    >
                      {downloading ? "Baixando..." : "Baixar"}
                    </button>
                    <button onClick={closeDownloadModal}>Cancelar</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Webview */}
      <div className={styles.body}>
        <webview
          ref={webviewRef}
          src="https://www.youtube.com"
          partition="persist:youtube"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
