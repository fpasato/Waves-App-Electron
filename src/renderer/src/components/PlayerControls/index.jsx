import styles from "./style.module.css";

import { FaPlay, FaPause, FaRandom } from "react-icons/fa";
import { GiPreviousButton, GiNextButton } from "react-icons/gi";
import { RiLoopLeftLine } from "react-icons/ri";

import { usePlayerStore } from "../../store/playerStore";
import { memo } from "react";

export const PlayerControls = memo(function PlayerControls() {
  // — música —
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const repeat = usePlayerStore((state) => state.repeat);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const toggleRepeat = usePlayerStore((state) => state.toggleRepeat);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const shuffleRemaining = usePlayerStore((state) => state.shuffleRemaining);
  const nextSong = usePlayerStore((state) => state.nextSong);
  const previousSong = usePlayerStore((state) => state.previousSong);

  // — rádio —
  const playerType = usePlayerStore((state) => state.playerType);
  const radioPlaying = usePlayerStore((state) => state.radioPlaying);
  const radioBuffering = usePlayerStore((state) => state.radioBuffering);
  const currentRadio = usePlayerStore((state) => state.currentRadio);
  const playRadio = usePlayerStore((state) => state.playRadio);
  const pauseRadio = usePlayerStore((state) => state.pauseRadio);

  const isRadio = playerType === "radio";

  const playing = isRadio ? radioPlaying : isPlaying;

  const handlePlayPause = () => {
    if (isRadio) {
      radioPlaying ? pauseRadio() : playRadio(currentRadio);
    } else {
      togglePlay();
    }
  };

  return (
    <div className={styles.playerControls}>
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
        className={`${styles.button} ${styles.subButton}`}
        onClick={previousSong}
        style={{ opacity: isRadio ? 0.2 : 1 }}
        disabled={isRadio}
      >
        <GiPreviousButton />
      </button>

      <button
        className={`${styles.button} ${styles.ppButton}`}
        onClick={handlePlayPause}
        disabled={isRadio && radioBuffering}
      >
        {playing ? <FaPause /> : <FaPlay />}
      </button>

      <button
        className={`${styles.button} ${styles.subButton}`}
        onClick={nextSong}
        style={{ opacity: isRadio ? 0.2 : 1 }}
        disabled={isRadio}
      >
        <GiNextButton />
      </button>

      <button
        className={`${styles.button} ${styles.outButton}`}
        onClick={shuffleRemaining}
        style={{ opacity: isRadio ? 0.2 : shuffle ? 1 : 0.4 }}
        disabled={isRadio}
      >
        <FaRandom />
      </button>
    </div>
  );
});