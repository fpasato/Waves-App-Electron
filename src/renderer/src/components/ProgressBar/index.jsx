import styles from "./style.module.css";
import { usePlayer } from "../../store/PlayerContext";
import { useRef, useState } from "react";


export function ProgressBar() {
  const { state, audioRef } = usePlayer(); // pega audioRef do contexto

  function seek(percent) {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    audio.currentTime = (percent / 100) * audio.duration;
  }

  // resto do código igual, só remove o useAudio
  const barRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function updateProgress(clientX) {
    const bar = barRef.current;

    if (!bar) return;

    const rect = bar.getBoundingClientRect();

    let percent = ((clientX - rect.left) / rect.width) * 100;

    percent = Math.max(0, Math.min(100, percent));

    seek(percent);
  }

  function handleMouseDown(e) {
    setDragging(true);
    updateProgress(e.clientX);
  }

  function handleMouseMove(e) {
    if (!dragging) return;

    updateProgress(e.clientX);
  }

  function handleMouseUp() {
    setDragging(false);
  }

  return (
    <div
      className={styles.progressBar}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className={styles.wavebars}>Wavebars</div>

      <div ref={barRef} className={styles.bar} onMouseDown={handleMouseDown}>
        <div
          className={styles.progress}
          style={{ width: `${state.progress}%` }}
        />

        <div className={styles.thumb} style={{ left: `${state.progress}%` }} />
      </div>

      <div className={styles.time}>
        {formatTime(state.currentTime)} / {formatTime(state.duration)}
      </div>
    </div>
  );
}
