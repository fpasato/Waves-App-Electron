// LibraryScreen/index.jsx
import { useEffect, useState, useCallback } from "react";
import { usePlayerStore } from "../../store/playerStore";
import { Header } from "../../Components/Header";
import { Button } from "../../Components/Button";
import styles from "./style.module.css";

// Componente placeholder com a inicial da música
function SongPlaceholder({ title }) {
  const initial = title?.trim()?.charAt(0)?.toUpperCase() || "?";
  return <span className={styles.songInitial}>{initial}</span>;
}

export function LibraryScreen({ setScreen }) {
  const {
    library,
    playSong,
    addToQueue,
    setQueue,
    clearRadio,
    syncLibraryWithDatabase,
  } = usePlayerStore();
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState("");

  const totalSeconds = library.reduce(
    (acc, song) => acc + (song.duration || 0),
    0,
  );

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const filteredLibrary = library.filter((song) => {
    const term = search.toLowerCase();
    return (
      song.title?.toLowerCase().includes(term) ||
      song.artist?.toLowerCase().includes(term)
    );
  });

  const scanFolders = useCallback(async () => {
    setScanning(true);
    try {
      await syncLibraryWithDatabase();
    } catch (err) {
      console.error("Erro ao escanear pastas:", err);
    } finally {
      setScanning(false);
    }
  }, [syncLibraryWithDatabase]);

  useEffect(() => {
    scanFolders();
  }, []);

  return (
    <div className={styles.libraryContainer}>
      <Header title="Biblioteca" onBack={() => setScreen("player")} />

      <div className={styles.libraryContentContainer}>
        <div className={styles.libraryHeader}>
          <div className={styles.libraryinfo}>
            <div className={styles.libraryinfoItem}>
              <h2>Total de Músicas: </h2>
              <p>{library.length}</p>
            </div>
            <div className={styles.libraryinfoItem}>
              <h2>Duração total: </h2>
              <p>{formatDuration(totalSeconds)}</p>
            </div>
          </div>

          <input
            className={styles.searchInput}
            type="text"
            placeholder="Buscar por título ou artista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className={styles.headerActions}>
            <Button
              title="Tocar Todas"
              onClick={() => {
                if (filteredLibrary.length === 0) return;
                clearRadio();
                setQueue(filteredLibrary);
                setScreen("player");
              }}
            />
            {/* Botão Voltar removido daqui – agora está no Header */}
          </div>
        </div>

        {scanning ? (
          <div className={styles.center}>
            <div className={styles.spinner} />
            <p>Escaneando pastas...</p>
          </div>
        ) : filteredLibrary.length > 0 ? (
          <ul className={styles.libraryContent}>
            {filteredLibrary.map((song) => (
              <li
                className={styles.libraryItem}
                key={song.id}
                onClick={() => {
                  clearRadio();
                  addToQueue(song);
                  playSong(song, [song]);
                  setScreen("player");
                }}
              >
                <div className={styles.libraryItemInfo}>
                  <SongPlaceholder title={song.title} />
                  <div className={styles.libraryItemInfoText}>
                    <h3>{song.title}</h3>
                    <p>{song.artist}</p>
                  </div>
                </div>
                <div className={styles.libraryItemActions}>
                  <Button
                    title="Adicionar à fila"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToQueue(song);
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.emptyState}>
            <p>
              {search
                ? "Nenhum resultado para sua busca"
                : "Nenhuma música encontrada"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}