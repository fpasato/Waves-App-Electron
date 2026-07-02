import { useEffect } from "react";
import styles from "./style.module.css";
import { Button } from "../../components/Button";
import { CUSTOM_CSS, SKIP_ADS_SCRIPT } from "./customCss";
import { GiClapperboard } from "react-icons/gi";
import {
  useSearchHandlers,
  DOWNLOAD_TYPES,
  MIX_VIDEO_QUALITIES,
  MIX_AUDIO_QUALITIES,
} from "../../hooks/Usesearchhandlers";

import { FaExplosion } from "react-icons/fa6";
import { GrFormPrevious } from "react-icons/gr";
import { GrFormNext } from "react-icons/gr";
import { IoReload } from "react-icons/io5";
import { FaHome, FaDownload, FaMusic } from "react-icons/fa";
import { BsSearch } from "react-icons/bs";
import { usePlayerStore } from "../../store/playerStore";

import { TbCookieOff, TbCookie } from "react-icons/tb";

export function SearchScreen({ setScreen, searchUrl, setSearchUrl, onClose }) {
  const toast = usePlayerStore((s) => s.toast);

  const {
    webviewRef,
    inputRef,
    canGoBack,
    canGoForward,
    updateNavState,
    handleGoBack,
    handleGoForward,
    handleReload,
    query,
    clearQuery,
    handleSearch,
    handleKeyDown,
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
    isLoggedIn,
    setIsLoggedIn,
    showLoginModal,
    handleLogin,
    handleLoginDone,
    handleLogout,
    mixInfo,
    mixMode,
    setMixMode,
    mixVideos,
    loadingMixVideos,
    toggleMixVideo,
    toggleAllMixVideos,
    mixQuality,
    setMixQuality,
    setQuery: setQuerySynced,
  } = useSearchHandlers({ setSearchUrl, setScreen, toast });

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    let destroyed = false;

    wv.setMaxListeners?.(50);

    async function injectScripts() {
      if (destroyed || !wv.isConnected) return;
      const url = wv.getURL?.();
      if (!url || url === "about:blank") return;
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
      const url = wv.getURL?.();
      if (!url || url === "about:blank") return;
      setSearchUrl(url);
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

    const handleStopLoading = async () => {
      if (destroyed || !wv.isConnected) return;
      const url = wv.getURL?.();
      if (!url || url === "about:blank") return;
      setSearchUrl(url);
      try {
        await injectScripts();
      } catch (e) {}
      if (!destroyed) updateNavState();
    };

    wv.addEventListener("dom-ready", handleDomReady);
    wv.addEventListener("did-stop-loading", handleStopLoading);

    return () => {
      destroyed = true;
      try {
        wv.removeEventListener("dom-ready", handleDomReady);
        wv.removeEventListener("did-stop-loading", handleStopLoading);
      } catch (e) {}
    };
  }, []);

  
  return (
    <div className={styles.searchScreen}>
      <div className={styles.searchHeader}>
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

        <div className={styles.searchInputWrapper}>
          <span className={styles.searchInput} title={searchUrl}>
            {searchUrl}
          </span>
        </div>

        <button
          className={styles.navBtn}
          onClick={handleSearch}
          disabled={!query.trim()}
        >
          <BsSearch />
        </button>

        <button
          className={styles.navBtn}
          onClick={openDownloadModal}
          title="Baixar vídeo"
        >
          <FaDownload />
        </button>

        <div className={styles.authWrapper}>
          <button
            className={styles.authBtn}
            onClick={isLoggedIn ? handleLogout : handleLogin}
            title={
              isLoggedIn
                ? "Deslogar e limpar cookies"
                : "Fazer login com Google"
            }
          >
            {isLoggedIn ? <TbCookie /> : <TbCookieOff />}
          </button>

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

          {showDownloadModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3>Download</h3>

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
                    <GiClapperboard /> Vídeo
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
                    <FaMusic /> Áudio (MP3)
                  </button>
                </div>

                {fetchingFormats ? (
                  <p>Carregando formatos...</p>
                ) : (
                  <>
                    {mixInfo && (
                      <div className={styles.mixBanner}>
                        <div className={styles.mixBannerInfo}>
                          <span>
                            <FaMusic />
                          </span>
                          <div>
                            <strong>{mixInfo.title}</strong>
                            {mixInfo.count && (
                              <small>
                                {mixVideos.length > 0
                                  ? `${mixVideos.length} vídeos carregados`
                                  : mixInfo.count
                                    ? `${mixInfo.count} vídeos`
                                    : null}
                              </small>
                            )}
                          </div>
                        </div>

                        <div className={styles.mixToggle}>
                          <button
                            className={`${styles.mixToggleBtn} ${mixMode === "single" ? styles.mixToggleActive : ""}`}
                            onClick={() => setMixMode("single")}
                          >
                            Só este vídeo
                          </button>
                          <button
                            className={`${styles.mixToggleBtn} ${mixMode === "mix" ? styles.mixToggleActive : ""}`}
                            onClick={() => setMixMode("mix")}
                          >
                            Mix inteira
                          </button>
                        </div>

                        {mixMode === "mix" && (
                          <div className={styles.mixVideoList}>
                            {loadingMixVideos ? (
                              <p className={styles.mixLoadingText}>
                                Carregando vídeos da mix...
                              </p>
                            ) : (
                              <>
                                <div className={styles.mixQualitySelector}>
                                  <label>Qualidade:</label>
                                  <select
                                    className={styles.mixQualitySelect}
                                    value={mixQuality}
                                    onChange={(e) =>
                                      setMixQuality(e.target.value)
                                    }
                                  >
                                    {downloadType === DOWNLOAD_TYPES.VIDEO
                                      ? MIX_VIDEO_QUALITIES.map((q) => (
                                          <option key={q.value} value={q.value}>
                                            {q.label}
                                          </option>
                                        ))
                                      : MIX_AUDIO_QUALITIES.map((q) => (
                                          <option key={q.value} value={q.value}>
                                            {q.label}
                                          </option>
                                        ))}
                                  </select>
                                </div>

                                <div className={styles.mixListHeader}>
                                  <span className={styles.mixListCount}>
                                    {mixVideos.filter((v) => v.selected).length}
                                    /{mixVideos.length} selecionados
                                  </span>
                                  <div className={styles.mixListActions}>
                                    <button
                                      className={styles.mixListActionBtn}
                                      onClick={() => toggleAllMixVideos(true)}
                                    >
                                      Todos
                                    </button>
                                    <button
                                      className={styles.mixListActionBtn}
                                      onClick={() => toggleAllMixVideos(false)}
                                    >
                                      Nenhum
                                    </button>
                                  </div>
                                </div>

                                <ul className={styles.mixVideoItems}>
                                  {mixVideos.map((v) => (
                                    <li
                                      key={v.id}
                                      className={`${styles.mixVideoItem} ${!v.selected ? styles.mixVideoItemDeselected : ""}`}
                                      onClick={() => toggleMixVideo(v.id)}
                                    >
                                      <input
                                        type="checkbox"
                                        className={styles.mixCheckbox}
                                        checked={v.selected}
                                        onChange={() => toggleMixVideo(v.id)}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <span className={styles.mixVideoIndex}>
                                        {v.index}.
                                      </span>
                                      <span className={styles.mixVideoTitle}>
                                        {v.title}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {(mixMode === "single" || !mixInfo) &&
                      downloadType === DOWNLOAD_TYPES.VIDEO && (
                        <>
                          {videoFormats.length === 0 ? (
                            <p>Nenhum formato de vídeo disponível.</p>
                          ) : (
                            videoFormats.map((f) => (
                              <button
                                key={f.id}
                                onClick={() => setSelectedFormatId(f.id)}
                                className={`${styles.formatButton} ${selectedFormatId === f.id ? styles.formatButtonSelected : ""}`}
                              >
                                {f.resolution}
                              </button>
                            ))
                          )}
                        </>
                      )}

                    {(mixMode === "single" || !mixInfo) &&
                      downloadType === DOWNLOAD_TYPES.AUDIO && (
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
                                  className={`${styles.formatButton} ${selectedFormatId === f.id ? styles.formatButtonSelected : ""}`}
                                >
                                  {label}
                                </button>
                              );
                            })
                          )}
                        </>
                      )}

                    <div className={styles.modalActions}>
                      <button
                        className={styles.downloadBtn}
                        onClick={() => {
                          handleStartDownload();
                          closeDownloadModal();
                        }}
                        disabled={
                          downloading ||
                          (mixInfo && mixMode === "mix"
                            ? mixVideos.filter((v) => v.selected).length === 0
                            : !selectedFormatId)
                        }
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
