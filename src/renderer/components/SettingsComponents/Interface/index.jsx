import { themes } from "../../../hooks/themes";
import { usePlayerStore } from "../../../store/playerStore";
import styles from "./style.module.css";

export function Interface() {
  const activeTheme = usePlayerStore((state) => state.activeTheme);
  const setActiveTheme = usePlayerStore((state) => state.setActiveTheme);
  const particlesEnabled = usePlayerStore((state) => state.particlesEnabled);
  const setParticlesEnabled = usePlayerStore((state) => state.setParticlesEnabled);

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Temas</h2>

      <div className={styles.grid}>
        {themes.map((t) => {
          const isActive = activeTheme.id === t.id;
          return (
            <button
              key={t.id}
              className={`${styles.card} ${isActive ? styles.active : ""}`}
              onClick={() => setActiveTheme(t)}
              aria-pressed={isActive}
            >
              <div
                className={styles.swatch}
                style={{
                  background: `linear-gradient(135deg, ${t.accent1}, ${t.accent2})`,
                }}
              />
              <span className={styles.name}>{t.name}</span>
              {isActive && <span className={styles.check}>✓</span>}
            </button>
          );
        })}
      </div>

      <div className={styles.divider} />

      <div className={styles.toggle}>
        <div className={styles.toggleText}>
          <span className={styles.toggleLabel}>Efeito de partículas</span>
          <span className={styles.toggleHint}>
            Exibe partículas animadas ao fundo
          </span>
        </div>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={particlesEnabled}
            onChange={(e) => setParticlesEnabled(e.target.checked)}
          />
          <span className={styles.slider} />
        </label>
      </div>
    </div>
  );
}