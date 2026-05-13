import { useState } from "react";
import styles from "./style.module.css";
import { usePlayerStore } from "../../store/playerStore";
import { useSettings } from "../../hooks/useDatabase";

export function PlaybackSettings() {
  const {
    fadeEnabled,
    setFadeEnabled,
    fadeDuration,
    setFadeDuration,
  } = usePlayerStore();

  const { set: setSetting } = useSettings();
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    try {
      await setSetting("fadeEnabled", String(fadeEnabled));
      await setSetting("fadeDuration", String(fadeDuration));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Playback</h2>
        <p>Transição entre músicas (gravado na base de dados).</p>
      </div>

      <div className={styles.option}>
        <label className={styles.toggleLabel}>
          <span>Fade entre músicas</span>
          <input
            type="checkbox"
            checked={fadeEnabled}
            onChange={(e) => setFadeEnabled(e.target.checked)}
          />
        </label>
        <p className={styles.description}>
          Nos últimos segundos da faixa atual, a seguinte entra em paralelo: fade
          out na atual e fade in na próxima (duração configurável).
        </p>
      </div>

      <div
        className={`${styles.option} ${!fadeEnabled ? styles.disabled : ""}`}
      >
        <label>
          Duração do fade: <strong>{fadeDuration}s</strong>
        </label>
        <input
          type="range"
          min="1"
          max="15"
          step="1"
          value={fadeDuration}
          disabled={!fadeEnabled}
          onChange={(e) => setFadeDuration(Number(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.sliderLabels}>
          <span>1s</span>
          <span>15s</span>
        </div>
      </div>

      <button type="button" className={styles.saveButton} onClick={handleSave}>
        {saved ? "Salvo!" : "Salvar"}
      </button>
    </div>
  );
}
