import { useEffect, useRef } from "react";
import styles from "./style.module.css";

import { Header } from "../../components/Header";
import { SideBar } from "../../components/PlayerComponents/SideBar";
import { SongsArea } from "../../components/PlayerComponents/SongsArea";
import { BackgroundVideo } from "../../components/PlayerComponents/BackgroundVideo";
import { PlayerControls } from "../../components/PlayerComponents/PlayerControls";
import { ProgressBar } from "../../components/PlayerComponents/ProgressBar";
import { VolumeControls } from "../../components/PlayerComponents/VolumeControls";

import { FaExplosion } from "react-icons/fa6";
import { randomCover } from "../../utils/randomCover";
import { usePlayerStore } from "../../store/playerStore"; 
import { useAnalyser } from "../../hooks/useAnalyser";
import { useLyrics } from "../../hooks/useLyrics";

export function PlayerScreen({ setScreen, file }) {
  useAnalyser();

  const currentSong = usePlayerStore((state) => state.currentSong);
  const currentRadio = usePlayerStore((state) => state.currentRadio);
  const playerType = usePlayerStore((state) => state.playerType);
  const clearRadio = usePlayerStore((state) => state.clearRadio);
  const playSong = usePlayerStore((state) => state.playSong);
  const lyricsEnabled = usePlayerStore((state) => state.lyricsEnabled);
  const toggleLyrics = usePlayerStore((state) => state.toggleLyrics);
  const activeTheme = usePlayerStore((state) => state.activeTheme);
  const prevSongIdRef = useRef(null);
  const {
    lines,
    activeIndex,
    status,
    isFading,
    currentLine,
    nextLine,
    offset,
    setOffset,
  } = useLyrics(lyricsEnabled);

  useEffect(() => {
    const id = currentSong?.id ?? null;
    if (prevSongIdRef.current !== null && prevSongIdRef.current !== id) {
      setOffset(0);
    }
    prevSongIdRef.current = id;
  }, [currentSong?.id, setOffset]);

  useEffect(() => {
    if (file) {
      playSong(file, [file]);
    }
  }, [file, playSong]);

  console.log(
    "🖥️ [PlayerScreen] re-renderizou, currentSong:",
    currentSong?.title,
  );

  return (
    <div className={styles.playerScreen}>
      <Header title="Vibe Player" />

      <div className={styles.content}>
        <SideBar setScreen={setScreen} />
        <BackgroundVideo
          theme={activeTheme}
          lyricsEnabled={lyricsEnabled}
          lines={lines}
          activeIndex={activeIndex}
          status={status}
          isFading={isFading}
          currentLine={currentLine}
          nextLine={nextLine}
        />
        <SongsArea />
      </div>

      <div className={styles.playerArea}>
        <div className={styles.musicInfo}>
          <div className={styles.musicInfoLeft}>
            <div className={styles.cover}>
              <img
                src={
                  playerType === "radio"
                    ? currentRadio?.favicon ||
                      randomCover(currentRadio?.name || "Radio")
                    : randomCover(currentSong?.title || "Music Name")
                }
                onError={(e) => {
                  e.currentTarget.onerror = null; // evita loop
                  e.currentTarget.src = randomCover(
                    currentRadio?.name || currentSong?.title || "Music",
                  );
                }}
              />
            </div>
            <div className={styles.musicDetails}>
              <h3>
                {playerType === "radio"
                  ? currentRadio?.name || "Rádio"
                  : currentSong?.title || "Sem Sons Reproduzindo"}
              </h3>
              <p>
                {playerType === "radio"
                  ? currentRadio?.country || "Rádio online"
                  : currentSong?.artist || ""}
              </p>
            </div>
          </div>
          {playerType === "radio" && (
            <button
              className={styles.clearRadioBtn}
              onClick={clearRadio}
              title="Remover rádio do player"
            >
              <FaExplosion />
            </button>
          )}
        </div>

        <PlayerControls
          lyricsEnabled={lyricsEnabled}
          onToggleLyrics={toggleLyrics}
          offset={offset}
          onOffsetChange={setOffset}
        />

        <ProgressBar />
        <VolumeControls />
      </div>
    </div>
  );
}
