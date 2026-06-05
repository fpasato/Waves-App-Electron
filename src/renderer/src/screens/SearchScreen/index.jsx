import { useEffect } from "react";
import styles from "./style.module.css";

import { Button } from "../../components/Button";
import { CUSTOM_CSS, SKIP_ADS_SCRIPT } from "./customCss";
import {
  useSearchHandlers,
  DOWNLOAD_TYPES,
} from "../../hooks/Usesearchhandlers";

import { FaExplosion } from "react-icons/fa6";
import { GrFormPrevious } from "react-icons/gr";
import { GrFormNext } from "react-icons/gr";
import { IoReload } from "react-icons/io5";
import { FaHome, FaDownload } from "react-icons/fa";
import { BsSearch } from "react-icons/bs";
import { ImExit } from "react-icons/im";
import { LuLogIn } from "react-icons/lu";

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
    mixInfo,
    mixMode,
    setMixMode,
    setQuery: setQuerySynced,
  } = useSearchHandlers({ setSearchUrl, setScreen });

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    let destroyed = false;
    wv.setMaxListeners?.(50);

    async function injectScripts() {
      if (destroyed || !wv.isConnected) return;
      try {
        await wv.insertCSS(CUSTOM_CSS);
      } catch (e) {}
      try {
        await wv.executeJavaScript(
          `try{(${SKIP_ADS_SCRIPT})()}catch(e){console.error('skip error',e)}`,
        );
      } catch (e) {}
    }

    const handleDomReady = async () => {
      if (destroyed || !wv.isConnected) return;
      await injectScripts();

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

    // did-stop-loading dispara após cada navegação SPA terminar de carregar
    const handleStopLoading = async () => {
      if (destroyed || !wv.isConnected) return;
      await injectScripts();
      if (!destroyed) updateNavState();
    };

    wv.addEventListener("dom-ready", handleDomReady);
    wv.addEventListener("did-stop-loading", handleStopLoading);

    return () => {
      destroyed = true;
      if (wv.isConnected) {
        wv.removeEventListener("dom-ready", handleDomReady);
        wv.removeEventListener("did-stop-loading", handleStopLoading);
      }
    };
  }, [updateNavState, setIsLoggedIn, webviewRef]);

  return (
    <div className={styles.searchScreen}>
      <div className={styles.searchHeader}>
        {/* Navegação */}
        <Button
          className={styles.backBtn}
          onClick={() => setScreen("player")}
          title={<FaHome />}
        />

        <button className={styles.navBtn} onClick={onClose} title="Fechar">
          <FaExplosion />
        </button>

        <button
          className={styles.navBtn}
          onClick={handleGoBack}
          disabled={!canGoBack}
          title="Voltar"
        >
          <GrFormPrevious />
        </button>
        <button
          className={styles.navBtn}
          onClick={handleGoForward}
          disabled={!canGoForward}
          title="Avançar"
        >
          <GrFormNext />
        </button>
        <button
          className={styles.navBtn}
          onClick={handleReload}
          title="Recarregar"
        >
          <IoReload />
        </button>

        {/* Busca */}
        <div className={styles.searchInputWrapper}>
          <input
            ref={inputRef}
            className={styles.searchInput}
            type="text"
            placeholder="Buscar no YouTube..."
            value={query}
            onChange={(e) => setQuerySynced(e.target.value)}
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
          className={styles.navBtn}
          onClick={handleSearch}
          disabled={!query.trim()}
        >
          <BsSearch />
        </button>

        {/* Download */}
        <button
          className={styles.navBtn}
          onClick={openDownloadModal}
          title="Baixar vídeo"
        >
          <FaDownload />
        </button>

        {/* Auth */}
        <div className={styles.authWrapper}>
          {isLoggedIn ? (
            <button
              className={`${styles.authBtn} ${styles.logoutBtn}`}
              onClick={handleLogout}
            >
              <ImExit />
            </button>
          ) : (
            <button className={styles.authBtn} onClick={handleLogin}>
              <LuLogIn />
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
                    {mixInfo && (
                      <div className="mix-toggle">
                        <p>
                          🎵 Mix detectada: <strong>{mixInfo.title}</strong>
                          {mixInfo.count && ` (${mixInfo.count} vídeos)`}
                        </p>
                        <div className="toggle-buttons">
                          <button
                            className={mixMode === "single" ? "active" : ""}
                            onClick={() => setMixMode("single")}
                          >
                            Só este vídeo
                          </button>
                          <button
                            className={mixMode === "mix" ? "active" : ""}
                            onClick={() => setMixMode("mix")}
                          >
                            Mix inteira
                          </button>
                        </div>
                      </div>
                    )}
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
                              className={`${styles.formatButton} ${
                                selectedFormatId === f.id
                                  ? styles.formatButtonSelected
                                  : ""
                              }`}
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
                                className={`${styles.formatButton} ${
                                  selectedFormatId === f.id
                                    ? styles.formatButtonSelected
                                    : ""
                                }`}
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

                    <div className={styles.modalActions}>
                      <button
                        className={styles.downloadBtn}
                        onClick={() => {
                          handleStartDownload();
                          closeDownloadModal();
                        }}
                        disabled={downloading || !selectedFormatId}
                      >
                        {downloading ? "Baixando..." : "Baixar"}
                      </button>

                      <button
                        className={styles.cancelBtn}
                        onClick={closeDownloadModal}
                      >
                        Cancelar
                      </button>
                    </div>
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
          id="youtube-view"
          src="https://www.youtube.com"
          partition="persist:youtube"
          nodeintegrationinsubframes="true"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
