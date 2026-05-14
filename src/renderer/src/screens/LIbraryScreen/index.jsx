import { usePlayerStore } from "../../store/playerStore";
import { Header } from "../../Components/Header";
import { Button } from "../../Components/Button";
import { randomCover } from "../../utils/randomCover";
import styles from "./style.module.css";
import { min } from "three/tsl";

export function LibraryScreen({ setScreen }) {
  const { library, playSong, addToQueue } = usePlayerStore();

  const totalSeconds = library.reduce(
    (acc, song) => acc + (song.duration || 0),
    0,
  );

  // Função para formatar segundos em MM:SS
  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return "0:00";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.libraryContainer}>
      <Header title="Library" />
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
          <div className={styles.libraryItemActions}>
            <Button
              title="Tocar Todas"
              onClick={() => {
                if (library.length === 0) return;
                playSong(library[0], library);
                setScreen("player");
              }}
            />
            <Button
              title="Voltar"
              className={styles.itemActionBack}
              onClick={() => setScreen("player")}
            />
          </div>
        </div>

        <ul className={styles.libraryContent}>
          {library.length > 0 ? (
            library.map((song) => (
              <li className={styles.libraryItem} key={song.id}>
                <div className={styles.libraryItemInfo}>
                  <img src={randomCover(song.title)} alt={song.title} />
                  <div className={styles.libraryItemInfoText}>
                    <h3>{song.title}</h3>
                    <p>{song.artist}</p>
                  </div>
                </div>

                <div className={styles.libraryItemActions}>
                  <Button
                    title="Tocar"
                    onClick={() => {
                      addToQueue(song);
                      playSong(song, [song]);
                      setScreen("player");
                    }}
                  />
                  <Button
                    title="Adicionar à fila"
                    onClick={() => addToQueue(song)}
                  />
                </div>
              </li>
            ))
          ) : (
            <div className={styles.libraryItem}>
              <p>Nenhuma música encontrada</p>
            </div>
          )}
        </ul>
      </div>
    </div>
  );
}
