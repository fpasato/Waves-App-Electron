import styles from "./style.module.css";

import { Header } from "../../components/Header";
import { SideBar } from "../../components/SideBar";
import { SongsArea } from "../../components/SongsArea";
import { BackgroundVideo } from "../../components/BackgroundVideo";
import { PlayerControls } from "../../components/PlayerControls";
import { ProgressBar } from "../../components/ProgressBar";
import { VolumeControls } from "../../components/VolumeControls";

import { randomCover } from "../../utils/randomCover";
import { usePlayerStore } from "../../store/playerStore";
import { useAnalyser } from "../../hooks/useAnalyser";

export function PlayerScreen({ setScreen }) {
  useAnalyser();
  const currentSong = usePlayerStore((state) => state.currentSong);
  const currentRadio = usePlayerStore((state) => state.currentRadio);
  const playerType = usePlayerStore((state) => state.playerType);
  const clearRadio = usePlayerStore((state) => state.clearRadio);

  console.log(
    "🖥️ [PlayerScreen] re-renderizou, currentSong:",
    currentSong?.title,
  );

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
              src={
                playerType === "radio"
                  ? currentRadio?.favicon || "/radio-default.png"
                  : randomCover(currentSong?.title || "Music Name")
              }
              onError={(e) => {
                e.currentTarget.src = "/radio-default.png";
              }}
            />
          </div>
          <div className={styles.musicDetails}>
            <h3>
              {playerType === "radio"
                ? currentRadio?.name || "Rádio"
                : currentSong?.title || "Music Name"}
            </h3>

            <p>
              {playerType === "radio"
                ? currentRadio?.country || "Rádio online"
                : currentSong?.artist || "Artist Name"}
            </p>
          </div>
          {playerType === "radio" && (
            <button
              className={styles.clearRadioBtn}
              onClick={clearRadio}
              title="Remover rádio do player"
            >
              ✕
            </button>
          )}
        </div>
        <PlayerControls />
        <ProgressBar />
        <VolumeControls />
      </div>
    </div>
  );
}
