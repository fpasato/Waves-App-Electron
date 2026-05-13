import styles from "./style.module.css";

import { FaPlay, FaPause, FaRandom } from "react-icons/fa";
import { GiPreviousButton, GiNextButton } from "react-icons/gi";
import { RiLoopLeftLine } from "react-icons/ri";

import { usePlayerStore } from "../../store/playerStore";

export function PlayerControls() {
  const { isPlaying, repeat, shuffle, toggleRepeat, togglePlay, toggleShuffle, nextSong, previousSong } = usePlayerStore();

  return (
    <div className={styles.playerControls}>
      <button
        className={styles.button}
        onClick={toggleRepeat}
        style={{ opacity: repeat ? 1 : 0.4 }}
      >
        <RiLoopLeftLine />
      </button>
      <button className={`${styles.button} ${styles.subButton}`} onClick={previousSong}>
        <GiPreviousButton />
      </button>
      <button className={`${styles.button} ${styles.ppButton}`} onClick={togglePlay}>
        {isPlaying ? <FaPause /> : <FaPlay />}
      </button>
      <button className={`${styles.button} ${styles.subButton}`} onClick={nextSong}>
        <GiNextButton />
      </button>
      <button
        className={styles.button}
        onClick={toggleShuffle}
        style={{ opacity: shuffle ? 1 : 0.4 }}
      >
        <FaRandom />
      </button>
    </div>
  );
}