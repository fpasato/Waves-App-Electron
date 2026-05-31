// src/components/PlayerControls/index.jsx
import styles from "./style.module.css";

import { FaPlay, FaPause, FaRandom } from "react-icons/fa";
import { GiPreviousButton, GiNextButton } from "react-icons/gi";
import { RiLoopLeftLine } from "react-icons/ri";
import { MdFiberManualRecord, MdStop } from "react-icons/md";
import { MdSubtitles } from "react-icons/md";
import {
  TbPlayerTrackNextFilled,
  TbPlayerTrackPrevFilled,
} from "react-icons/tb";

import { LuPlay } from "react-icons/lu"; //play
import { LuPause } from "react-icons/lu";
import { TbPlayerTrackNext } from "react-icons/tb";
import { TbPlayerTrackPrev } from "react-icons/tb";
import { RxTrackNext } from "react-icons/rx";
import { RxTrackPrevious } from "react-icons/rx";

import { usePlayerStore } from "../../store/playerStore";
import { memo, useState, useRef, useCallback } from "react";

export const PlayerControls = memo(function PlayerControls({
  lyricsEnabled,
  onToggleLyrics,
  offset = 0,
  onOffsetChange,
}) {
  // — música —
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const repeat = usePlayerStore((state) => state.repeat);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const toggleRepeat = usePlayerStore((state) => state.toggleRepeat);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const shuffleRemaining = usePlayerStore((state) => state.shuffleRemaining);
  const nextSong = usePlayerStore((state) => state.nextSong);
  const previousSong = usePlayerStore((state) => state.previousSong);
  const playerType = usePlayerStore((state) => state.playerType);
  const seekForward = usePlayerStore((state) => state.seekForward);
  const seekBackward = usePlayerStore((state) => state.seekBackward);

  // — rádio —
  const radioPlaying = usePlayerStore((state) => state.radioPlaying);
  const radioBuffering = usePlayerStore((state) => state.radioBuffering);
  const currentRadio = usePlayerStore((state) => state.currentRadio);
  const playRadio = usePlayerStore((state) => state.playRadio);
  const pauseRadio = usePlayerStore((state) => state.pauseRadio);

  // — gravação —
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const isRadio = playerType === "radio";
  const playing = isRadio ? radioPlaying : isPlaying;

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

      let stream;
      try {
        stream = audioEl.captureStream?.() ?? audioEl.mozCaptureStream?.();
      } catch (e) {
        console.error("captureStream não suportado:", e);
        return;
      }

      if (!stream) return;

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const arrayBuffer = await blob.arrayBuffer();
        const radioName = currentRadio?.name ?? "radio";

        try {
          const savedPath = await window.api.radio.saveRecording(
            arrayBuffer,
            radioName,
          );
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

  return (
    <div className={styles.playerControls}>
      <div className={styles.songsButtonContainer}>
        <button
          className={`${styles.button} ${styles.buttonTertiary}`}
          onClick={() => seekBackward(10)}
          style={{ opacity: isRadio ? 0.2 : 1 }}
          disabled={isRadio}
        >
          <TbPlayerTrackPrevFilled />
        </button>

        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={previousSong}
          style={{ opacity: isRadio ? 0.2 : 1 }}
          disabled={isRadio}
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
          style={{ opacity: isRadio ? 0.2 : 1 }}
          disabled={isRadio}
        >
          <GiNextButton />
        </button>

        <button
          className={`${styles.button} ${styles.buttonTertiary}`}
          onClick={() => seekForward(10)}
          style={{ opacity: isRadio ? 0.2 : 1 }}
          disabled={isRadio}
        >
          <TbPlayerTrackNextFilled />
        </button>
      </div>
      <div className={styles.controlsContainer}>
        <button
          className={`${styles.button} ${styles.outButton}`}
          onClick={toggleRepeat}
          style={{ opacity: isRadio ? 0.2 : repeat ? 1 : 0.4 }}
          disabled={isRadio}
          title={isRadio ? "Indisponível para rádio" : undefined}
        >
          <RiLoopLeftLine />
        </button>
        <button
          className={`${styles.button} ${styles.outButton}`}
          onClick={shuffleRemaining}
          style={{ opacity: isRadio ? 0.2 : shuffle ? 1 : 0.4 }}
          disabled={isRadio}
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
        {lyricsEnabled && !isRadio && (
          <div className={styles.offsetControls}>
            <button
              className={`${styles.button} ${styles.outButton}`}
              onClick={() => onOffsetChange(offset - 0.5)}
            >
              −
            </button>
            <span className={styles.offsetLabel}>
              {offset > 0 ? `+${offset}s` : `${offset}s`}
            </span>
            <button
              className={`${styles.button} ${styles.outButton}`}
              onClick={() => onOffsetChange(offset + 0.5)}
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
