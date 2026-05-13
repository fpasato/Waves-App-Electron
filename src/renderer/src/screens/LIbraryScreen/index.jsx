import { usePlayer } from "../../store/PlayerContext";
import { Header } from "../../Components/Header";
import { Button } from "../../Components/Button";

import { randomCover } from "../../utils/randomCover";

import styles from "./style.module.css";

export function LibraryScreen({ setScreen }) {
  const { state, dispatch } = usePlayer();

  return (
    <div className={styles.libraryContainer}>
      <Header title="Library" />
      <div className={styles.libraryContentContainer}>
        <div className={styles.libraryHeader}>
          <div className={styles.libraryinfo}>
            <h2>Total de Músicas: {state.library.length}</h2>
            <h2>
              Duração total:{" "}
              {state.library.reduce((acc, song) => acc + song.duration, 0)}
            </h2>
          </div>
          <div className={styles.libraryItemActions}>
            <Button title="Tocar Todas" />
            <Button
              title={"Voltar"}
              className={styles.itemActionBack}
              onClick={() => setScreen("player")}
            />
          </div>
        </div>

        <div className={styles.libraryContent}>
          {state.library.length > 0 ? (
            state.library.map((song) => (
              <div className={styles.libraryItem} key={song.id}>
                <div className={styles.libraryItemInfo}>
                  <img src={randomCover(song.name)} alt={song.name} />

                  <div className={styles.libraryItemInfoText}>
                    <h3>{song.title}</h3>
                    <p>{song.artist}</p>
                  </div>
                </div>

                <div className={styles.libraryItemActions}>
                  <Button
                    title="Tocar"
                    onClick={() => {
                      dispatch({ type: "SET_QUEUE", payload: [song] });
                      dispatch({ type: "SET_SONG", payload: song });
                      setScreen("player");
                    }}
                  />
                  <Button
                    title="Adicionar à fila"
                    onClick={() => {
                      dispatch({ type: "ADD_TO_QUEUE", payload: song });
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className={styles.libraryItem}>
              <p>Nenhuma música encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
