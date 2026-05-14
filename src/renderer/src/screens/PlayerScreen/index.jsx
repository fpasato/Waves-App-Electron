import styles from "./style.module.css";

import { Header } from "../../Components/Header";
import { SideBar } from "../../Components/Sidebar";
import { SongsArea } from "../../Components/SongsArea";
import { BackgroundVideo } from "../../Components/BackgroundVideo";
import { PlayerControls } from "../../Components/PlayerControls";
import { ProgressBar } from "../../Components/ProgressBar";
import { VolumeControls } from "../../Components/VolumeControls";

import { randomCover } from "../../utils/randomCover";
import { usePlayerStore } from "../../store/playerStore";
import { useAnalyser } from "../../hooks/useAnalyser";

export function PlayerScreen({ setScreen }) {
  useAnalyser();
  const { currentSong } = usePlayerStore();
  console.log("🖥️ [PlayerScreen] re-renderizou, currentSong:", currentSong?.title);


  return (
    <div className={styles.playerScreen}>
      <Header title="Player" />

      <div className={styles.content}>
        <SideBar setScreen={setScreen} />
        <BackgroundVideo />
        <SongsArea />
      </div>

      <div className={styles.playerArea}>
        <div className={styles.musicInfo}>
          <div className={styles.cover}>
            <img
              src={randomCover(currentSong?.title || "Music Name")}
              alt={currentSong?.title || "Music Name"}
            />
          </div>
          <div className={styles.musicDetails}>
            <h3>{currentSong?.title || "Music Name"}</h3>
            <p>{currentSong?.artist || "Artist Name"}</p>
          </div>
        </div>
        <PlayerControls />
        <ProgressBar />
        <VolumeControls />
      </div>
    </div>
  );
}