import { useRef, useState } from "react";
import { useSearch } from "../../hooks/useSearch";
import { useYoutubeActions } from "../../hooks/useYoutubeActions";
import { SearchHeader } from "../../components/SearchComponents/SearchHeader";
import { VideoPlayer } from "../../components/SearchComponents/VideoPlayer";
import { VideoGrid } from "../../components/SearchComponents/VideoGrid";
import { VideoList } from "../../components/SearchComponents/VideoList";
import { QualityModal } from "../../components/SearchComponents/QualityModal";
import styles from "./style.module.css";

export function SearchScreen({ setScreen }) {
  const search = useSearch();
  const youtubeActions = useYoutubeActions();

  const [activeVideo, setActiveVideo] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [modalItem, setModalItem] = useState(null);

  const [history, setHistory] = useState(["home"]);
  const currentPage = history[history.length - 1];

  const loadingRef = useRef(false);

  // "results" nunca é empilhado duas vezes seguidas — evita precisar
  // clicar voltar N vezes depois de buscar várias vezes
  const navigateToResults = () => {
    setHistory((prev) => {
      const top = prev[prev.length - 1];
      if (top === "results") return prev;
      // Se veio do player, limpa os players e vai pra results
      if (top === "player") {
        const withoutPlayers = prev.filter((p) => p !== "player");
        return [...withoutPlayers, "results"];
      }
      return [...prev, "results"];
    });
  };

  const goBack = () => {
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const handleSearch = (query) => {
    search.handleSearch(query);
    navigateToResults();
  };

  const handleClear = () => {
    search.clearSearch();
    setHistory(["home"]);
  };

  const handleCardClick = async (item) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    setVideoLoading(true);
    setVideoError(null);
    setActiveVideo({
      ...item,
      videoUrl: null,
      audioUrl: null,
      formats: [],
    });

    // Sempre empilha "player" — goBack volta vídeo a vídeo
    setHistory((prev) => [...prev, "player"]);

    try {
      const [stream, formats] = await Promise.all([
        window.api.youtube.getStream(item.id),
        window.api.youtube.getFormats(item.id),
      ]);
      setActiveVideo({ ...item, ...stream, formats });
    } catch (err) {
      setVideoError("Erro ao carregar vídeo.");
      // Remove o "player" empilhado se o carregamento falhou
      setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    } finally {
      setVideoLoading(false);
      loadingRef.current = false;
    }
  };

  const handleQualityChange = async (formatId) => {
    if (!activeVideo) return;
    setVideoLoading(true);
    try {
      const stream = await window.api.youtube.getStream(
        activeVideo.id,
        formatId,
      );
      setActiveVideo((prev) => ({ ...prev, ...stream }));
    } catch {
      setVideoError("Erro ao trocar qualidade.");
    } finally {
      setVideoLoading(false);
    }
  };
  const handleRefresh = () => {
    if (currentPage === "player") {
      // Recarrega o vídeo atual
      if (activeVideo?.id) handleCardClick(activeVideo);
    } else {
      search.refresh();
    }
  };
  const handlePlayerClose = () => {
    setActiveVideo(null);
    goBack();
  };

  const currentList =
    search.view === "featured" ? search.featured : search.results;

  return (
    <div className={styles.searchScreen}>
      <SearchHeader
        query={search.query}
        setQuery={search.setQuery}
        loading={search.loading}
        view={search.view}
        setView={search.setView}
        onSearch={() => handleSearch(search.query)}
        onClear={handleClear}
        onBack={history.length > 1 ? goBack : null}
        setScreen={setScreen}
        onRefresh={handleRefresh}
      />

      {search.error && <div className={styles.error}>{search.error}</div>}
      {videoError && <div className={styles.error}>{videoError}</div>}

      {currentPage === "player" && (
        <VideoPlayer
          activeVideo={activeVideo}
          videoLoading={videoLoading}
          suggestions={currentList}
          onSuggestionClick={handleCardClick}
          onQualityChange={handleQualityChange}
          onClose={handlePlayerClose}
          actions={youtubeActions}
        />
      )}

      {currentPage === "home" && (
        <VideoGrid
          items={search.featured}
          loading={search.featuredLoading}
          loadingId={youtubeActions.loadingId}
          onCardClick={handleCardClick}
          onDownloadClick={(e, item) => {
            e.stopPropagation();
            setModalItem(item);
          }}
        />
      )}

      {currentPage === "results" && (
        <VideoList
          items={search.results}
          loading={search.loading}
          loadingId={youtubeActions.loadingId}
          onCardClick={handleCardClick}
        />
      )}

      {modalItem && (
        <QualityModal
          item={modalItem}
          onClose={() => setModalItem(null)}
          actions={youtubeActions}
        />
      )}
    </div>
  );
}
