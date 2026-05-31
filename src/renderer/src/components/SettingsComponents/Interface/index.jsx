import { themes } from "../../../hooks/themes";
import { usePlayerStore } from "../../../store/playerStore";
import styles from "./style.module.css";

export function Interface({ setTheme }) {
  const activeTheme = usePlayerStore((state) => state.activeTheme);
  const setActiveTheme = usePlayerStore((state) => state.setActiveTheme);
  const particlesEnabled = usePlayerStore((state) => state.particlesEnabled);
  const setParticlesEnabled = usePlayerStore(
    (state) => state.setParticlesEnabled,
  );

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
            <div
              className={styles.preview}
              style={{ background: t.gradient }}
            />
            <span>{t.name}</span>
          </button>
        ))}
      </div>

      <div className={styles.toggleRow}>
        <div className={styles.toggleInfo}>
          <span className={styles.toggleTitle}>Efeito de partículas</span>

          <span className={styles.toggleDescription}>
            Exibe partículas animadas ao fundo
          </span>
        </div>

        <input
          type="checkbox"
          checked={particlesEnabled}
          onChange={(e) => setParticlesEnabled(e.target.checked)}
        />
      </div>
    </div>
  );
}
