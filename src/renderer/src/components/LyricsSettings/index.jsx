import { usePlayerStore } from "../../store/playerStore";
import styles from "./style.module.css";

export function LyricsSettings() {
  const lyricsSource = usePlayerStore((s) => s.lyricsSource);
  const setLyricsSource = usePlayerStore((s) => s.setLyricsSource);

  return (
    <div className={styles.lyricsSettings}>
      <h2>Legendas</h2>

      <div className={styles.settingRow}>
        <label className={styles.settingLabel}>Fonte das legendas</label>
        <div className={styles.radioGroup}>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="lyricsSource"
              value="lrclib"
              checked={lyricsSource === "lrclib"}
              onChange={() => setLyricsSource("lrclib")}
            />
            <span>LRCLIB</span>
            <small>Busca online por letra sincronizada</small>
          </label>

          <label className={styles.radioOption}>
            <input
              type="radio"
              name="lyricsSource"
              value="whisperx"
              checked={lyricsSource === "whisperx"}
              onChange={() => setLyricsSource("whisperx")}
            />
            <span>WhisperX</span>
            <small>Transcrição local via IA (requer backend rodando)</small>
          </label>
        </div>
      </div>

      {lyricsSource === "whisperx" && (
        <p className={styles.whisperxNote}>
          ⚙️ O backend WhisperX deve estar rodando em{" "}
          <code>localhost:8765</code>. A transcrição ocorre automaticamente ao
          trocar de música.
        </p>
      )}
    </div>
  );
}