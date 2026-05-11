import styles from "./style.module.css";

import { FaPlay } from "react-icons/fa";
import { FaPause } from "react-icons/fa";
import { GiPreviousButton } from "react-icons/gi";
import { GiNextButton } from "react-icons/gi";
import { RiLoopLeftLine } from "react-icons/ri";
import { FaRandom } from "react-icons/fa";

export function PlayerControls() {
  return (
    <div className={styles.playerControls}>
      <button className={styles.button}>
        <RiLoopLeftLine />
      </button>
      <button className={`${styles.button} ${styles.subButton}`}>
        <GiPreviousButton />
      </button>
      <button className={`${styles.button} ${styles.ppButton}`}>
        <FaPause />
      </button>
      <button className={`${styles.button} ${styles.subButton}`}>
        <GiNextButton />
      </button>
      <button className={styles.button}>
        <FaRandom />
      </button>
    </div>
  );
}
