import { useRef, useState, useEffect, useCallback } from "react";
import styles from "./style.module.css";
import { QualityModal } from "../QualityModal";

export function VideoPlayer({
  activeVideo,
  videoLoading,
  suggestions,
  onSuggestionClick,
  onQualityChange,
  onClose,
  actions,
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const renewTimerRef = useRef(null);
  const savedTimeRef = useRef(0); // ← novo

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentFormatId, setCurrentFormatId] = useState(null);
  const [currentResolution, setCurrentResolution] = useState(null);

  // Quando formatos carregam, pega a resolução do primeiro (maior)
  useEffect(() => {
    if (activeVideo?.formats?.length > 0) {
      setCurrentFormatId(activeVideo.formats[0].id);
      setCurrentResolution(activeVideo.formats[0].resolution);
    } else {
      setCurrentFormatId(null);
      setCurrentResolution(null);
    }
  }, [activeVideo?.id]);

  // Quando troca qualidade, atualiza a resolução mostrada
  const handleQualityChange = (formatId) => {
    const format = activeVideo.formats.find((f) => f.id === formatId);
    setCurrentFormatId(formatId);
    setCurrentResolution(format?.resolution || null);
    savedTimeRef.current = videoRef.current?.currentTime || 0;
    setQualityLoading(true);
    onQualityChange?.(formatId);
    setShowQuality(false);
  };

  useEffect(() => {
    if (!activeVideo?.expiresAt) return;
    clearTimeout(renewTimerRef.current);
    const msUntilExpiry = activeVideo.expiresAt - Date.now() - 60_000;
    if (msUntilExpiry <= 0) return;
    renewTimerRef.current = setTimeout(async () => {
      console.log("🔄 Renovando stream...", activeVideo.id);
      try {
        const stream = await window.api.youtube.getStream(activeVideo.id);
        const video = videoRef.current;
        const audio = audioRef.current;

        // Salva estado atual
        const savedTime = video?.currentTime || 0;
        const wasPlaying = !video?.paused;

        // Para tudo
        video?.pause();
        audio?.pause();

        if (video) {
          video.src = stream.videoUrl;
          // Não chama video.load() — deixa o browser fazer lazy
          video.addEventListener(
            "canplay",
            () => {
              video.currentTime = savedTime;
              if (wasPlaying) video.play().catch(() => {});
            },
            { once: true },
          );
          video.load(); // load após setar o listener
        }

        if (audio && stream.audioUrl) {
          audio.src = stream.audioUrl;
          audio.addEventListener(
            "canplay",
            () => {
              audio.currentTime = savedTime;
              if (wasPlaying) audio.play().catch(() => {});
            },
            { once: true },
          );
          audio.load();
        }
      } catch (e) {
        console.error("Erro ao renovar stream:", e);
      }
    }, msUntilExpiry);

    return () => clearTimeout(renewTimerRef.current);
  }, [activeVideo?.expiresAt]);

  // Troca de vídeo — restaura posição salva
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !activeVideo?.videoUrl) return;

    audio?.pause(); // pausa áudio enquanto carrega

    video.src = activeVideo.videoUrl;
    video.load();

    if (audio && activeVideo.audioUrl) {
      audio.src = activeVideo.audioUrl;
      audio.load();
    }

    const handleCanPlay = () => {
      const restoreTime = savedTimeRef.current;
      video.currentTime = restoreTime;
      if (audio) audio.currentTime = restoreTime;
      savedTimeRef.current = 0;
      setQualityLoading(false); // ← aqui

      if (playing) {
        video.play().catch(() => {});
        audio?.play().catch(() => {});
      }
    };

    video.addEventListener("canplay", handleCanPlay, { once: true });
    return () => video.removeEventListener("canplay", handleCanPlay);
  }, [activeVideo?.videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handler = () => setDuration(video.duration || 0);
    video.addEventListener("loadedmetadata", handler);
    return () => video.removeEventListener("loadedmetadata", handler);
  }, [activeVideo?.videoUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(console.error);
      audio?.play().catch(console.error);
      setPlaying(true);
    } else {
      video.pause();
      audio?.pause();
      setPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setProgress((video.currentTime / video.duration) * 100 || 0);

    const audio = audioRef.current;
    // Só corrige se o drift for maior que 1.5s (não 0.3s)
    if (audio && Math.abs(audio.currentTime - video.currentTime) > 1.5) {
      audio.currentTime = video.currentTime;
    }
  };

  const handleProgressClick = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = ratio * (videoRef.current?.duration || 0);

    setSeeking(true); // ← ativa loading

    if (videoRef.current) videoRef.current.currentTime = newTime;

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = newTime;
    }

    videoRef.current?.addEventListener(
      "seeked",
      () => {
        setSeeking(false); // ← desativa loading
        if (playing) audio?.play().catch(() => {});
      },
      { once: true },
    );
  };

  const handleVolume = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) videoRef.current.volume = val;
    if (audioRef.current) audioRef.current.volume = val;
    setMuted(val === 0);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
    if (audioRef.current) audioRef.current.muted = next;
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return "0:00";

    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = Math.floor(s % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.videoWrap}>
          <video
            ref={videoRef}
            className={styles.video}
            muted={!!activeVideo?.audioUrl || muted}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => {
              setPlaying(false);
              audioRef.current?.pause();
            }}
            onClick={togglePlay}
          />
          {activeVideo?.audioUrl && <audio ref={audioRef} />}

          <div className={styles.overlay} onClick={togglePlay}>
            {!playing && !qualityLoading && !videoLoading && !seeking && (
              <span className={styles.bigPlay}>▶</span>
            )}
          </div>

          {(videoLoading || qualityLoading || seeking) && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
            </div>
          )}
        </div>
        <div className={styles.controls}>
          <div
            className={styles.progressBar}
            ref={progressRef}
            onClick={handleProgressClick}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
            <div
              className={styles.progressThumb}
              style={{ left: `${progress}%` }}
            />
          </div>

          <div className={styles.controlsRow}>
            <button className={styles.ctrlBtn} onClick={togglePlay}>
              {playing ? "⏸" : "▶"}
            </button>
            <button className={styles.ctrlBtn} onClick={toggleMute}>
              {muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={muted ? 0 : volume}
              onChange={handleVolume}
              className={styles.volumeSlider}
            />
            <span className={styles.time}>
              {fmt(currentTime)} / {fmt(duration)}
            </span>
            <div style={{ flex: 1 }} />

            {activeVideo?.formats?.length > 0 && (
              <div className={styles.qualityWrap}>
                <button
                  className={styles.ctrlBtn}
                  onClick={() => setShowModal(true)}
                >
                  ⬇ Download
                </button>

                {showModal && (
                  <QualityModal
                    item={activeVideo}
                    onClose={() => setShowModal(false)}
                    actions={actions}
                  />
                )}

                <button
                  className={styles.ctrlBtn}
                  onClick={() => setShowQuality((q) => !q)}
                >
                  ⚙ {currentResolution || "Qualidade"}
                </button>
                {showQuality && (
                  <div className={styles.qualityDropdown}>
                    {activeVideo.formats.map((f) => (
                      <button
                        key={f.id}
                        className={`${styles.qualityOption} ${currentFormatId === f.id ? styles.qualityActive : ""}`}
                        onClick={() => handleQualityChange(f.id)}
                      >
                        {currentFormatId === f.id ? "✓ " : ""}
                        {f.resolution} {f.ext}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.info}>
          <p className={styles.title}>{activeVideo?.title}</p>
          <p className={styles.channel}>{activeVideo?.channel}</p>
        </div>
      </div>

      <div className={styles.suggestions}>
        <h3>Próximos</h3>
        {suggestions
          .filter((item) => item.id !== activeVideo?.id)
          .slice(0, 15)
          .map((item) => (
            <div
              key={item.id}
              className={styles.suggestionItem}
              onClick={() => onSuggestionClick(item)}
            >
              <div className={styles.suggestionThumb}>
                <img
                  src={item.thumbnail?.replace("http://", "https://")}
                  alt=""
                />
                {item.duration && (
                  <span className={styles.suggestionDuration}>
                    {item.duration}
                  </span>
                )}
              </div>
              <div className={styles.suggestionInfo}>
                <p className={styles.suggestionTitle}>{item.title}</p>
                <p className={styles.suggestionChannel}>{item.channel}</p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
