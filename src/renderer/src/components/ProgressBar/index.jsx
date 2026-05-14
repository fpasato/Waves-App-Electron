import styles from "./style.module.css";
import { usePlayer } from "../../store/PlayerContext";
import { usePlayerStore } from "../../store/playerStore";
import { useRef, useState, useEffect } from "react";
import { useAnalyser } from "../../hooks/useAnalyser";
// ⚠️ NÃO importe useAudio

export function ProgressBar() {
  const { audioRef, crossfadeAudioRef, analyserRef, activeAudioRef, seekRef } =
    usePlayer(); // ← seekRef
  const { progress } = usePlayerStore();

  const [time, setTime] = useState({ current: 0, duration: 0 });
  const barRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragPercent, setDragPercent] = useState(null);

  useAnalyser();

  // ── TIMEUPDATE (sem alterações) ──
  useEffect(() => {
    const onTime = () => {
      const active = activeAudioRef.current;
      if (!active) return;
      const dur = active.duration || 0;
      const ct = active.currentTime || 0;
      if (!isNaN(dur) && !isNaN(ct)) {
        setTime({ current: ct, duration: dur });
      }
    };
    const a = audioRef.current;
    const b = crossfadeAudioRef.current;
    a?.addEventListener("timeupdate", onTime);
    b?.addEventListener("timeupdate", onTime);
    return () => {
      a?.removeEventListener("timeupdate", onTime);
      b?.removeEventListener("timeupdate", onTime);
    };
  }, [activeAudioRef, audioRef, crossfadeAudioRef]);

  // ── CANVAS DRAW (sem alterações) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const totalBars = 150;
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
      const w = canvas.width;
      const h = canvas.height;
      if (w < 10 || h < 10) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const accent = getComputedStyle(document.body)
        .getPropertyValue("--accent")
        .trim();

      ctx.clearRect(0, 0, w, h);

      let dataArray = null;
      if (analyser) {
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
      }

      const grad = ctx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, accent);

      ctx.fillStyle = grad;
      ctx.shadowColor = accent;
      ctx.shadowBlur = Math.max(15, Math.min(40, w * 0.05)); // mínimo 15

      const barWidth = w / totalBars;

      for (let i = 0; i < totalBars; i++) {
        const isLeft = i < half;
        const idx = mapIndex(isLeft ? i : i - half, isLeft);
        const raw = dataArray ? dataArray[idx] : 0;
        const maxBarHeight = h * 0.75;
        const targetHeight = Math.max(4, (raw / 255) * maxBarHeight);

        smoothedHeights[i] =
          smoothedHeights[i] * smoothing + targetHeight * (1 - smoothing);

        // Define a largura real da barra como 75% do espaço disponível (25% vira espaço em branco)
        // O Math.max(1, ...) garante que a barra nunca suma completamente
        const actualBarWidth = Math.max(1, barWidth * 0.75);

        // Centraliza a barra dentro do seu próprio "slot"
        const xPos = i * barWidth + (barWidth - actualBarWidth) / 2;

        ctx.fillRect(
          xPos,
          h - smoothedHeights[i],
          actualBarWidth,
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
  }, [analyserRef]);

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function updateDragPosition(clientX) {
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    let percent = ((clientX - rect.left) / rect.width) * 100;
    percent = Math.max(0, Math.min(100, percent));
    setDragPercent(percent);
  }

  function commitSeek() {
    if (dragPercent !== null) {
      seekRef.current?.(dragPercent); // ← chama o seek real do player principal
      setDragPercent(null);
    }
  }

  function handleMouseDown(e) {
    setDragging(true);
    updateDragPosition(e.clientX);
  }

  function handleMouseMove(e) {
    if (!dragging) return;
    updateDragPosition(e.clientX);
  }

  function handleMouseUp() {
    if (dragging) {
      commitSeek();
      setDragging(false);
    }
  }

  const displayPercent = dragPercent !== null ? dragPercent : progress;

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
          style={{ width: `${displayPercent}%` }}
        />
        <div className={styles.thumb} style={{ left: `${displayPercent}%` }} />
      </div>
      <div className={styles.time}>
        {formatTime(time.current)} / {formatTime(time.duration)}
      </div>
    </div>
  );
}
