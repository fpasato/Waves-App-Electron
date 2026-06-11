import { useEffect, useState } from "react";
import { usePlayerStore } from "../../store/playerStore";
import { Header } from "../../Components/Header";
import { Button } from "../../Components/Button";
import { randomCover } from "../../utils/randomCover";
import styles from "./style.module.css";

function groupByDay(recents) {
  const groups = {};
  for (const song of recents) {
    const date = new Date(song.played_at + "Z");
    const key = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(song);
  }
  return Object.entries(groups);
}

export function RecentScreen({ setScreen }) {
  const { playSong, clearRadio } = usePlayerStore();
  const [recents, setRecents] = useState([]);

  useEffect(() => {
    window.api.db.recents.list(100).then(setRecents);
  }, []);

  const groups = groupByDay(recents);

  return (
    <div className={styles.container}>
      <Header title="Tocados Recentemente" />
      {groups.length === 0 ? (
        <p className={styles.empty}>Nenhuma música tocada ainda.</p>
      ) : (
        <div className={styles.groups}>
          {groups.map(([day, songs]) => (
            <div key={day} className={styles.group}>
              <h2 className={styles.dayLabel}>{day}</h2>
              <ul className={styles.list}>
                {songs.map((song, i) => (
                  <li className={styles.item} key={`${song.id}-${i}`}>
                    <span className={styles.time}>
                      {new Date(song.played_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <img src={randomCover(song.title)} alt={song.title} className={styles.cover} />
                    <div className={styles.info}>
                      <h3>{song.title}</h3>
                      <p>{song.artist}</p>
                    </div>
                    <Button
                      title="Tocar"
                      onClick={() => {
                        clearRadio();
                        playSong(song, [song]);
                        setScreen("player");
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <Button title="Voltar" onClick={() => setScreen("player")} />
    </div>
  );
}