import { themes } from "../../../hooks/themes";
import { usePlayerStore } from "../../../store/playerStore";
import styles from "./style.module.css";

export function Interface({ setTheme }) {
  const activeTheme = usePlayerStore((state) => state.activeTheme);
  const setActiveTheme = usePlayerStore((state) => state.setActiveTheme);

  return (
    <div className={styles.interface}>
      <h1>Interface</h1>
      <div className={styles.themeGrid}>
        {themes.map((t) => (
          <button
            key={t.id}
            className={`${styles.themeCard} ${activeTheme.id === t.id ? styles.active : ""}`}
            onClick={() => setActiveTheme(t)}
          >
            <div className={styles.preview} style={{ background: t.gradient }} />
            <span>{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}