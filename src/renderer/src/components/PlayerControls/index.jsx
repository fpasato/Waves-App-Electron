import styles from "./style.module.css";

import { FaPlay, FaPause, FaRandom } from "react-icons/fa";
import { GiPreviousButton, GiNextButton } from "react-icons/gi";
import { RiLoopLeftLine } from "react-icons/ri";

import { usePlayer } from "../../store/PlayerContext";

export function PlayerControls() {
  const { state, dispatch } = usePlayer();

  return (
    <div className={styles.playerControls}>
      <button
        className={styles.button}
        onClick={() => dispatch({ type: 'TOGGLE_REPEAT' })}
        style={{ opacity: state.repeat ? 1 : 0.4 }}
      >
        <RiLoopLeftLine />
      </button>
      <button className={`${styles.button} ${styles.subButton}`}
      onClick={() => dispatch({ type: 'PREVIOUS_SONG' })}
      >
        <GiPreviousButton />
      </button>
      <button
        className={`${styles.button} ${styles.ppButton}`}
        onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}
      >
        {state.isPlaying ? <FaPause /> : <FaPlay />}
      </button>
      <button className={`${styles.button} ${styles.subButton}`}
      onClick={() => dispatch({ type: 'NEXT_SONG' })}
      >
        <GiNextButton />
      </button>
      <button
        className={styles.button}
        onClick={() => dispatch({ type: 'TOGGLE_SHUFFLE' })}
        style={{ opacity: state.shuffle ? 1 : 0.4 }}
      >
        <FaRandom />
      </button>
    </div>
  );
}