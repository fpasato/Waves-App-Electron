import { useState, useEffect, useRef } from "react";
import { usePlayerStore } from "../../store/playerStore";
import { Button } from "../../components/Button";
import styles from "./style.module.css";

import { TbPlaylistAdd } from "react-icons/tb";
import { FaDownload } from "react-icons/fa";

export function SearchScreen({ setScreen }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(false);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("featured");
  const [loadingId, setLoadingId] = useState(null);
  const inputRef = useRef(null);

  const playSong = usePlayerStore((state) => state.playSong);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const profile = await window.profile?.getUserProfile?.();
        console.log("PROFILE NO FRONTEND:", profile);
        console.log("searchHistory:", profile?.searchHistory);
        console.log(
          "queries que serão buscadas:",
          profile?.searchHistory?.length > 0
            ? profile.searchHistory.slice(0, 6)
            : ["top hits 2025"],
        );
        console.log("PROFILE NO FRONTEND:", profile);
        const history = profile?.searchHistory || [];
        const DEFAULT_QUERIES = [
          "pop hits 2025",
          "rock classics",
          "hip hop 2025",
          "electronic music",
          "indie 2025",
          "jazz hits",
        ];

        const historySluice = history.slice(0, 6);

        // Completa até 6 queries com fallbacks
        const queries = [...historySluice, ...DEFAULT_QUERIES].slice(0, 6);

        const allResults = await Promise.all(
          queries.map((q) =>
            window.api.youtube.search(q, true).then((r) => r.slice(0, 5)),
          ),
        );

        // Achata e remove duplicatas por id
        const seen = new Set();
        const merged = allResults.flat().filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });

        setFeatured(merged); // até 30 cards
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
    setView("results"); // 👈
    try {
      const items = await window.api.youtube.search(query);
      setResults(items);
      window.profile?.saveSearchHistory(query);
    } catch (err) {
      setError("Erro ao buscar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };
  const handleClear = () => {
    setQuery("");
    setView("featured"); // 👈
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

  const isGridMode = view === "featured";

  return (
    <div className={styles.searchScreen}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => {
            if (view === "results") {
              setView("featured"); // 👈 volta pra featured, não pro player
              setQuery("");
              setResults([]);
            } else {
              setScreen("player"); // só sai da SearchScreen se estiver no featured
            }
          }}
        >
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
      {view === "results" && (
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
                      handleAddToQueue(item);
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
