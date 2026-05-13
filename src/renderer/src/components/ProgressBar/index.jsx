import styles from "./style.module.css";
import { usePlayer } from "../../store/PlayerContext";
import { useRef, useState, useEffect } from "react";
import { useAnalyser } from "../../hooks/useAnalyser";

export function ProgressBar() {
  const { state, audioRef } = usePlayer();
  const { analyserRef } = useAnalyser();

  const barRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  // =========================
  // CANVAS DRAW
  // =========================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const totalBars = 80;
    const half = totalBars / 2;
    const maxIndex = 70;
    let smoothedHeights = new Array(totalBars).fill(0);
    const smoothing = 0.7;

    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    const mapIndex = (pos, isLeft) => {
      const t = pos / (half - 1);
      const idx = isLeft ? (1 - t) * maxIndex : t * maxIndex;
      return Math.min(maxIndex, Math.max(0, Math.floor(idx)));
    };

    const draw = () => {
      const analyser = analyserRef.current;
      console.log("analyser:", analyser);
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      let dataArray = null;
      if (analyser) {
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
      }

      const grad = ctx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, "#7c3aed");
      grad.addColorStop(1, "#a855f7");
      ctx.fillStyle = grad;
      ctx.shadowBlur = 22;
      ctx.shadowColor = "rgba(168, 85, 247, 0.9)";

      const barWidth = w / totalBars;
      for (let i = 0; i < totalBars; i++) {
        const isLeft = i < half;
        const idx = mapIndex(isLeft ? i : i - half, isLeft);
        const raw = dataArray ? dataArray[idx] : 0;
        const targetHeight = Math.max(4, (raw / 255) * h);
        smoothedHeights[i] =
          smoothedHeights[i] * smoothing + targetHeight * (1 - smoothing);
        ctx.fillRect(
          i * barWidth,
          h - smoothedHeights[i],
          barWidth - 1,
          smoothedHeights[i],
        );
      }

      ctx.shadowBlur = 0;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
    };
  }, []);

  function seek(percent) {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    audio.currentTime = (percent / 100) * audio.duration;
  }

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
      <canvas ref={canvasRef} className={styles.wavebars} />

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
