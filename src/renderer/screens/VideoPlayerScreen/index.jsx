import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "../../components/Button";
import { usePlayerStore } from "../../store/playerStore";
import { GiClapperboard } from "react-icons/gi";
import {
  FaPlay,
  FaPause,
  FaBackward,
  FaForward,
  FaVolumeUp,
  FaVolumeMute,
  FaExpand,
  FaCompress,
  FaVideo,
} from "react-icons/fa";
import styles from "./style.module.css";

// ── Helpers ──────────────────────────────────────────────
const formatTime = (s) => {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

const formatBytes = (b) => {
  if (!b) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0,
    v = b;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${u[i]}`;
};

// ── Sub-components ────────────────────────────────────────
const IconBtn = ({ onClick, label, children, size = 34 }) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className={styles.iconBtn}
    style={{ width: size, height: size }}
  >
    {children}
  </button>
);

const VideoCard = ({ file, isActive, onClick }) => (
  <div
    className={`${styles.card} ${isActive ? styles.cardActive : ""}`}
    onClick={onClick}
  >
    <div className={styles.cardThumb}>
      <GiClapperboard size={18} />
    </div>
    <div className={styles.cardMeta}>
      <p className={styles.cardTitle}>
        {file.title || file.filename || "Sem título"}
      </p>
      <p className={styles.cardInfo}>{formatBytes(file.size)}</p>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────
export function VideoPlayerScreen({ setScreen, video }) {
  const toast = usePlayerStore((s) => s.toast);

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const videoRef = useRef(null);
  const idleTimer = useRef(null);
  const fileInputRef = useRef(null);

  const handlePickFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    playVideo({ path: url, filename: file.name, size: file.size, isBlob: true });
    e.target.value = ""; // reseta para permitir escolher o mesmo arquivo de novo
  };

  const resetIdleTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setShowControls(false), 5000);
  }, []);

  // Limpa o timer ao desmontar
  useEffect(() => () => clearTimeout(idleTimer.current), []);

  // Load list
  useEffect(() => {
    (async () => {
      try {
        const list = await window.electronAPI.downloads.listVideos();
        setVideos(list || []);
      } catch {
        toast({ message: "Erro ao carregar vídeos.", type: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  // Play a file
  const playVideo = useCallback(async (file) => {
    if (!videoRef.current || !file) return;
    setCurrent(file);
    setBuffering(true);
    // Se for blob URL (do input file), usa direto; se tiver src usa src; se for path do sistema, adiciona file://
    videoRef.current.src = file.isBlob || file.path?.startsWith('blob:') ? file.path : (file.src || `file://${file.path}`);
    try {
      await videoRef.current.play();
    } catch {}
  }, []);

  // Play initial video if provided
  useEffect(() => {
    if (video) {
      playVideo(video);
    }
  }, [video, playVideo]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !current) return;
    v.paused ? v.play().catch(() => {}) : v.pause();
  };

  const playNext = useCallback(() => {
    if (!current || !videos.length) return;
    const i = videos.findIndex((f) => f.path === current.path);
    playVideo(videos[(i + 1) % videos.length]);
  }, [current, videos, playVideo]);

  const playPrev = () => {
    if (!current || !videos.length) return;
    const i = videos.findIndex((f) => f.path === current.path);
    playVideo(videos[(i - 1 + videos.length) % videos.length]);
  };

  const toggleFullscreen = () => {
    const next = !fullscreen;
    setFullscreen(next);
    window.electronAPI.setFullscreen(next);
  };

  // Sai do fullscreen com Esc
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") {
        setFullscreen(false);
        window.electronAPI.setFullscreen(false);
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);

  // Video events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const handlers = {
      timeupdate: () => setProgress(v.currentTime),
      loadedmetadata: () => setDuration(v.duration),
      play: () => setIsPlaying(true),
      pause: () => setIsPlaying(false),
      ended: () => {
        setIsPlaying(false);
        playNext();
      },
      canplay: () => setBuffering(false),
      error: () => {
        setBuffering(false);
        toast({ message: "Erro ao carregar vídeo.", type: "error" });
      },
    };

    Object.entries(handlers).forEach(([e, fn]) => v.addEventListener(e, fn));
    return () =>
      Object.entries(handlers).forEach(([e, fn]) =>
        v.removeEventListener(e, fn),
      );
  }, [playNext, toast]);

  // Volume / mute sync
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const pct = duration ? (progress / duration) * 100 : 0;

  return (
    <div className={`${styles.hub} ${fullscreen ? styles.hubFullscreen : ""}`}>
      <div className={styles.container}>
        {/* ── Player ── */}
        <div className={styles.playerSection}>
          {/* O click no wrapper faz toggle play; os controles param a propagação */}
          <div
            className={`${styles.videoWrapper} ${!showControls ? styles.videoWrapperIdle : ""}`}
            onClick={togglePlay}
            onMouseMove={resetIdleTimer}
          >
            {!current && !buffering && (
              <div className={styles.emptyPlayer}>
                <FaVideo size={40} />
                <span>Escolha um vídeo na playlist</span>
              </div>
            )}

            <video
              ref={videoRef}
              className={styles.videoElement}
              preload="metadata"
              playsInline
            />

            {buffering && (
              <div className={styles.videoLoading}>
                <div className={styles.spinner} />
              </div>
            )}

            {/* Controles flutuantes – só renderiza quando há vídeo */}
            {current && (
              <div
                className={styles.controls}
                style={{
                  opacity: showControls ? 1 : 0,
                  transform: showControls ? "translateY(0)" : "translateY(6px)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Barra de progresso */}
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={progress}
                  onChange={(e) => {
                    if (!videoRef.current) return;
                    videoRef.current.currentTime = +e.target.value;
                    setProgress(+e.target.value);
                  }}
                  className={styles.progress}
                  style={{ "--pct": `${pct}%` }}
                />

                <div className={styles.controlsRow}>
                  <div className={styles.left}>
                    <IconBtn onClick={playPrev} label="Anterior" size={30}>
                      <FaBackward size={13} />
                    </IconBtn>
                    <IconBtn
                      onClick={togglePlay}
                      label={isPlaying ? "Pausar" : "Play"}
                      size={38}
                    >
                      {isPlaying ? <FaPause size={17} /> : <FaPlay size={17} />}
                    </IconBtn>
                    <IconBtn onClick={playNext} label="Próximo" size={30}>
                      <FaForward size={13} />
                    </IconBtn>

                    <IconBtn
                      onClick={() => setMuted(!muted)}
                      label={muted ? "Som" : "Mudo"}
                      size={30}
                    >
                      {muted ? (
                        <FaVolumeMute size={14} />
                      ) : (
                        <FaVolumeUp size={14} />
                      )}
                    </IconBtn>

                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={muted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(+e.target.value);
                        setMuted(false);
                      }}
                      className={styles.volumeSlider}
                    />

                    <span className={styles.time}>
                      {formatTime(progress)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className={styles.right}>
                    <span className={styles.videoTitle}>
                      {current?.title || current?.filename || ""}
                    </span>
                    <IconBtn
                      onClick={toggleFullscreen}
                      label={fullscreen ? "Sair" : "Tela cheia"}
                      size={30}
                    >
                      {fullscreen ? (
                        <FaCompress size={13} />
                      ) : (
                        <FaExpand size={13} />
                      )}
                    </IconBtn>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Playlist ({videos.length})</h2>
            <div className={styles.sidebarActions}>
              <button
                className={styles.openFileBtn}
                onClick={() => fileInputRef.current?.click()}
                title="Abrir arquivo de vídeo"
              >
                <FaVideo size={12} />
                Abrir
              </button>
              <Button
                title="Voltar"
                onClick={() => setScreen("player")}
                className={styles.backButton}
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/x-matroska,video/avi,video/quicktime,video/webm,audio/mpeg,audio/flac,audio/wav,audio/ogg,audio/mp4"
              style={{ display: "none" }}
              onChange={handlePickFile}
            />
          </div>

          <div className={styles.videoList}>
            {loading ? (
              <div className={styles.emptyList}>
                <div className={styles.spinner} />
              </div>
            ) : videos.length === 0 ? (
              <div className={styles.emptyList}>
                <FaVideo size={28} />
                <span>Playlist vazia</span>
              </div>
            ) : (
              videos.map((file) => (
                <VideoCard
                  key={file.path}
                  file={file}
                  isActive={current?.path === file.path}
                  onClick={() => playVideo(file)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
