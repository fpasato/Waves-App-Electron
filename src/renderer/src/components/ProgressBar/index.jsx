import styles from "./style.module.css";
import { usePlayer } from "../../store/PlayerContext";
import { usePlayerStore } from "../../store/playerStore";
import { useRef, useState, useEffect } from "react";
import { useAnalyser } from "../../hooks/useAnalyser";

export function ProgressBar() {
  const { audioRef, crossfadeAudioRef, analyserRef, activeAudioRef } =
    usePlayer();
  const { progress } = usePlayerStore();

  const [time, setTime] = useState({ current: 0, duration: 0 });
  const barRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  useAnalyser();

  // ── TIMEUPDATE — lê sempre o elemento ativo ───────────────────────────────
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
  }, []);

  // ── SEEK — usa o elemento ativo ───────────────────────────────────────────
  function seek(percent) {
    const active = activeAudioRef.current;
    if (!active?.duration) return;
    active.currentTime = (percent / 100) * active.duration;
  }

  // ── CANVAS DRAW ───────────────────────────────────────────────────────────
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
      const w = canvas.width;
      const h = canvas.height;

      const accent =
        getComputedStyle(document.body).getPropertyValue("--accent").trim()
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
      ctx.shadowBlur = 22;
      ctx.shadowColor = accent;

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
        <div className={styles.progress} style={{ width: `${progress}%` }} />
        <div className={styles.thumb} style={{ left: `${progress}%` }} />
      </div>

      <div className={styles.time}>
        {formatTime(time.current)} / {formatTime(time.duration)}
      </div>
    </div>
  );
}
