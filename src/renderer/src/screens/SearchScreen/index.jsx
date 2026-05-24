import { useState, useEffect, useRef } from "react";
import { usePlayerStore } from "../../store/playerStore";
import { Button } from "../../components/Button";
import styles from "./style.module.css";

import { TbPlaylistAdd } from "react-icons/tb";
import { FaDownload } from "react-icons/fa";

const DEFAULT_QUERY = "hits brasil 2025";

export function SearchScreen({ setScreen }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(false);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const inputRef = useRef(null);

  const playSong = usePlayerStore((state) => state.playSong);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const items = await window.api.youtube.search(DEFAULT_QUERY);
        setFeatured(items);
      } catch (e) {
        console.error(e);
      } finally {
        setFeaturedLoading(false);
      }
    }
    loadFeatured();
  }, []);

const handleDownload = async (item) => {
  try {
    setLoadingId(item.id);

    const result = await window.api.youtube.download({
      videoId: item.id,
      title: item.title,
    });

    if (!result.success) throw new Error(result.error);

    alert(`Download concluído: ${item.title}`);
  } catch (err) {
    console.error(err);
    alert("Erro ao baixar música.");
  } finally {
    setLoadingId(null);
  }
};

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const items = await window.api.youtube.search(query);
      setResults(items);
    } catch (err) {
      setError("Erro ao buscar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setHasSearched(false);
    setResults([]);
    inputRef.current?.focus();
  };

  const handlePlaySong = async (item) => {
    setLoadingId(item.id);
    try {
      const audioUrl = await window.api.youtube.getAudioUrl(item.id);
      const song = {
        id: item.id,
        title: item.title,
        artist: item.channel,
        src: audioUrl,
        duration: item.duration,
        thumbnail: item.thumbnail,
      };
      playSong(song, [song]);
      setScreen("player");
    } catch (err) {
      console.error(err);
      alert("Erro ao reproduzir. Tente outro vídeo.");
    } finally {
      setLoadingId(null);
    }
  };

  const addToQueue = usePlayerStore((state) => state.addToQueue);

  const handleAddToQueue = async (item) => {
    setLoadingId(item.id);
    try {
      const audioUrl = await window.api.youtube.getAudioUrl(item.id);
      addToQueue({
        id: item.id,
        title: item.title,
        artist: item.channel,
        src: audioUrl,
        duration: item.duration,
        thumbnail: item.thumbnail,
      });
    } catch (err) {
      alert("Erro ao adicionar à fila.");
    } finally {
      setLoadingId(null);
    }
  };

  const displayItems = hasSearched ? results : featured;
  const isGridMode = !hasSearched;

  return (
    <div className={styles.searchScreen}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => setScreen("player")}>
          ←
        </button>
        <form className={styles.searchBar} onSubmit={handleSearch}>
          <div className={styles.inputWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar artista, música..."
              className={styles.input}
            />
            {query && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClear}
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className={styles.searchBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : "Buscar"}
          </button>
        </form>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Section title */}
      <div className={styles.sectionTitle}>
        {isGridMode ? (
          featuredLoading ? (
            <span className={styles.shimmerText}>Carregando destaques...</span>
          ) : (
            <span>🔥 Em alta agora</span>
          )
        ) : (
          <span>
            {results.length} resultado{results.length !== 1 ? "s" : ""} para "
            {query}"
          </span>
        )}
      </div>

      {isGridMode && (
        <div className={styles.grid}>
          {featuredLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard} />
              ))
            : featured.map((item) => (
                <div
                  key={item.id}
                  className={styles.gridCard}
                  onClick={() => handlePlaySong(item)}
                >
                  <div className={styles.gridThumb}>
                    <img
                      src={item.thumbnail?.replace("http://", "https://")}
                      alt={item.title}
                    />
                    <div className={styles.gridOverlay}>
                      {loadingId === item.id ? (
                        <span className={styles.spinnerLarge} />
                      ) : (
                        <span className={styles.playIcon}>▶</span>
                      )}
                    </div>
                    <span className={styles.duration}>{item.duration}</span>
                  </div>
                  <div className={styles.gridInfo}>
                    <p className={styles.gridTitle}>{item.title}</p>
                    <p className={styles.gridChannel}>{item.channel}</p>
                  </div>
                  <div className={styles.gridActions}>
                    <Button
                      className={styles.addBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToQueue(item);
                      }}
                      title={<TbPlaylistAdd />}
                    />
                    <Button
                      className={styles.addBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(item);
                      }}
                      title={<FaDownload />}
                    />
                  </div>
                </div>
              ))}
        </div>
      )}

      {/* List mode — resultados de busca */}
      {hasSearched && (
        <div className={styles.list}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={styles.skeletonRow} />
              ))
            : results.map((item) => (
                <div
                  key={item.id}
                  className={styles.listCard}
                  onClick={() => handlePlaySong(item)}
                >
                  <div className={styles.listThumb}>
                    <img
                      src={item.thumbnail?.replace("http://", "https://")}
                      alt={item.title}
                    />
                    {loadingId === item.id && (
                      <div className={styles.listThumbOverlay}>
                        <span className={styles.spinner} />
                      </div>
                    )}
                  </div>
                  <div className={styles.listInfo}>
                    <p className={styles.listTitle}>{item.title}</p>
                    <p className={styles.listChannel}>{item.channel}</p>
                    <span className={styles.listDuration}>{item.duration}</span>

                    <button
                      className={styles.addBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(item);
                      }}
                      title="Download"
                    >
                      <FaDownload />
                    </button>
                  </div>
                  <button
                    className={styles.addBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToQueue(item); // ← era "futuramente: download"
                    }}
                    title="Adicionar à fila"
                  >
                    +
                  </button>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
