import { useEffect, useState } from "react";
import { Header } from "../../Components/Header";
import { Button } from "../../Components/Button";
import { randomCover } from "../../utils/randomCover";
import styles from "./style.module.css";

function groupByDay(recents) {
  const groups = {};
  for (const song of recents) {
    const date = new Date(song.played_at + "Z");
    const key = date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(song);
  }
  return Object.entries(groups);
}

export function RecentScreen({ setScreen }) {
  const [recents, setRecents] = useState([]);
  const [expandedDays, setExpandedDays] = useState(new Set()); // colapsado por padrão

  const fetchRecents = () => {
    window.api.db.recents.list(100).then(setRecents);
  };

  useEffect(() => {
    fetchRecents();
  }, []);

  const handleClear = () => {
    window.api.db.recents.clear().then(() => {
      setRecents([]);
    });
  };

  const toggleDay = (day) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  const groups = groupByDay(recents);

  return (
    <div className={styles.container}>
      <Header title="Recentes" onBack={() => setScreen("player")} />

      <div className={styles.topActions}>
        <Button
          title="Limpar registros"
          onClick={handleClear}
          className={styles.actionButton}
        />
      </div>

      {groups.length === 0 ? (
        <p className={styles.empty}>Nenhuma música tocada ainda.</p>
      ) : (
        <div className={styles.timeline}>
          {groups.map(([day, songs]) => {
            const isExpanded = expandedDays.has(day);
            return (
              <div key={day} className={styles.dayGroup}>
                <div
                  className={styles.dayHeader}
                  onClick={() => toggleDay(day)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && toggleDay(day)}
                >
                  <span className={styles.dayDot} />
                  <h2 className={styles.dayLabel}>{day}</h2>
                  <span className={styles.expandIcon}>
                    {isExpanded ? "▼" : "▶"}
                  </span>
                </div>
                {isExpanded && (
                  <div className={styles.songs}>
                    {songs.map((song, i) => (
                      <div className={styles.songRow} key={`${song.id}-${i}`}>
                        <div className={styles.timelineDot} />
                        <div className={styles.songCard}>
                          <div className={styles.timeBadge}>
                            {new Date(song.played_at).toLocaleTimeString(
                              "pt-BR",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </div>
                          <img
                            src={randomCover(song.title)}
                            alt={song.title}
                            className={styles.cover}
                          />
                          <div className={styles.meta}>
                            <h3 className={styles.title}>{song.title}</h3>
                            <p className={styles.artist}>{song.artist}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}