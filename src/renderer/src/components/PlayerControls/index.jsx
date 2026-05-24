import styles from "./style.module.css";

import { FaPlay, FaPause, FaRandom } from "react-icons/fa";
import { GiPreviousButton, GiNextButton } from "react-icons/gi";
import { RiLoopLeftLine } from "react-icons/ri";

import { usePlayerStore } from "../../store/playerStore";
import { memo } from "react";

export const PlayerControls = memo(function PlayerControls() {
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const repeat = usePlayerStore((state) => state.repeat);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const toggleRepeat = usePlayerStore((state) => state.toggleRepeat);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const shuffleRemaining = usePlayerStore((state) => state.shuffleRemaining);
  const nextSong = usePlayerStore((state) => state.nextSong);
  const previousSong = usePlayerStore((state) => state.previousSong);
  return (
    <div className={styles.playerControls}>
      <button
        className={`${styles.button} ${styles.outButton}`}
        onClick={toggleRepeat}
        style={{ opacity: repeat ? 1 : 0.4 }}
      >
        <RiLoopLeftLine />
      </button>
      <button
        className={`${styles.button} ${styles.subButton}`}
        onClick={previousSong}
      >
        <GiPreviousButton />
      </button>
      <button
        className={`${styles.button} ${styles.ppButton}`}
        onClick={togglePlay}
      >
        {isPlaying ? <FaPause /> : <FaPlay />}
      </button>
      <button
        className={`${styles.button} ${styles.subButton}`}
        onClick={nextSong}
      >
        <GiNextButton />
      </button>
      <button
        className={`${styles.button} ${styles.outButton}`}
        onClick={shuffleRemaining}
      >
        <FaRandom />
      </button>
    </div>
  );
});
