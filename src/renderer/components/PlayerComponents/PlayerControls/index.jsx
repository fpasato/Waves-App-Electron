// src/components/PlayerControls/index.jsx
import styles from "./style.module.css";
import { FaPlay, FaPause, FaRandom } from "react-icons/fa";
import { GiPreviousButton, GiNextButton } from "react-icons/gi";
import { RiLoopLeftLine } from "react-icons/ri";
import { MdFiberManualRecord, MdStop, MdSubtitles } from "react-icons/md";
import { TbPlayerTrackNextFilled, TbPlayerTrackPrevFilled } from "react-icons/tb";
import { usePlayerStore } from "../../../store/playerStore";
import { memo, useState, useRef, useCallback } from "react";

export const PlayerControls = memo(function PlayerControls({
  lyricsEnabled,
  onToggleLyrics,
  offset = 0,
  onOffsetChange,
}) {
  // ────────── Store ──────────
  const {
    // Música local
    isPlaying,
    repeat,
    shuffle,
    toggleRepeat,
    togglePlay,
    shuffleRemaining,
    nextSong,
    previousSong,
    playerType,
    seekForward,
    seekBackward,
    // Rádio
    radioPlaying,
    radioBuffering,
    currentRadio,
    playRadio,
    pauseRadio,
  } = usePlayerStore();

  // ────────── Estado local ──────────
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // ────────── Derivados ──────────
  const isRadio = playerType === "radio";
  const playing = isRadio ? radioPlaying : isPlaying;

  // ────────── Handlers ──────────
  const handlePlayPause = () => {
    if (isRadio) {
      radioPlaying ? pauseRadio() : playRadio(currentRadio);
    } else {
      togglePlay();
    }
  };

  const handleRecord = useCallback(() => {
    if (!isRecording) {
      const audioEl = usePlayerStore.getState()._radioAudio;
      if (!audioEl) return;

      const stream = audioEl.captureStream?.() ?? audioEl.mozCaptureStream?.();
      if (!stream) return;

      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const arrayBuffer = await blob.arrayBuffer();
        const radioName = currentRadio?.name ?? "radio";

        try {
          const savedPath = await window.api.radio.saveRecording(arrayBuffer, radioName);
          console.log("✅ Gravação salva em:", savedPath);
        } catch (e) {
          console.error("❌ Erro ao salvar gravação:", e);
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } else {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  }, [isRecording, currentRadio]);

  // ────────── Render ──────────
  return (
    <div className={styles.playerControls}>
      {/* Controles de navegação/transporte */}
      <div className={styles.songsButtonContainer}>
        <button
          className={`${styles.button} ${styles.buttonTertiary}`}
          onClick={() => seekBackward(10)}
          disabled={isRadio}
          style={{ opacity: isRadio ? 0.2 : 1 }}
        >
          <TbPlayerTrackPrevFilled />
        </button>

        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={previousSong}
          disabled={isRadio}
          style={{ opacity: isRadio ? 0.2 : 1 }}
        >
          <GiPreviousButton />
        </button>

        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={handlePlayPause}
          disabled={isRadio && radioBuffering}
        >
          {playing ? <FaPause /> : <FaPlay />}
        </button>

        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={nextSong}
          disabled={isRadio}
          style={{ opacity: isRadio ? 0.2 : 1 }}
        >
          <GiNextButton />
        </button>

        <button
          className={`${styles.button} ${styles.buttonTertiary}`}
          onClick={() => seekForward(10)}
          disabled={isRadio}
          style={{ opacity: isRadio ? 0.2 : 1 }}
        >
          <TbPlayerTrackNextFilled />
        </button>
      </div>

      {/* Controles auxiliares */}
      <div className={styles.controlsContainer}>
        <button
          className={`${styles.button} ${styles.outButton}`}
          onClick={toggleRepeat}
          disabled={isRadio}
          style={{ opacity: isRadio ? 0.2 : repeat ? 1 : 0.4 }}
          title={isRadio ? "Indisponível para rádio" : undefined}
        >
          <RiLoopLeftLine />
        </button>

        <button
          className={`${styles.button} ${styles.outButton}`}
          onClick={shuffleRemaining}
          disabled={isRadio}
          style={{ opacity: isRadio ? 0.2 : shuffle ? 1 : 1 }}
        >
          <FaRandom />
        </button>

        <button
          className={`${styles.button} ${styles.outButton} ${isRecording ? styles.recordingActive : ""}`}
          onClick={handleRecord}
          disabled={!isRadio || !radioPlaying}
          title={
            !isRadio
              ? "Disponível apenas para rádio"
              : !radioPlaying
                ? "Inicie a rádio para gravar"
                : isRecording
                  ? "Parar gravação"
                  : "Gravar rádio"
          }
          style={{
            opacity: !isRadio ? 0.2 : !radioPlaying ? 0.4 : 1,
            color: isRecording ? "var(--record-active, #ff3b3b)" : undefined,
          }}
        >
          {isRecording ? <MdStop /> : <MdFiberManualRecord />}
        </button>

        <button
          className={`${styles.button} ${styles.outButton} ${lyricsEnabled ? styles.lyricsActive : ""}`}
          onClick={onToggleLyrics}
          disabled={isRadio}
          style={{ opacity: isRadio ? 0.2 : lyricsEnabled ? 1 : 0.4 }}
          title={
            isRadio
              ? "Indisponível para rádio"
              : lyricsEnabled
                ? "Desativar legenda"
                : "Ativar legenda"
          }
        >
          <MdSubtitles />
        </button>

        {/* Controles de offset da legenda (ajuste grosso) */}
         {lyricsEnabled && !isRadio && (
          <div className={styles.offsetControls}>
            <button
              className={`${styles.button} ${styles.outButton}`}
              onClick={() => onOffsetChange(offset - 0.5)}
              title="Atrasar -0.5s"
            >
              −
            </button>
            <span className={styles.offsetLabel}>
              {offset > 0 ? `+${offset.toFixed(1)}` : offset.toFixed(1)}s
            </span>
            <button
              className={`${styles.button} ${styles.outButton}`}
              onClick={() => onOffsetChange(offset + 0.5)}
              title="Adiantar +0.5s"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
});