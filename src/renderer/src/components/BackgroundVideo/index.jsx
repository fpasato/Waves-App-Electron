import { memo } from "react";
import { ParticlesEffect } from "../ParticlesEffect";
import { LyricsDisplay } from "../LyricsDisplay";
import { usePlayerStore } from "../../store/playerStore";
import styles from "./style.module.css";

export const BackgroundVideo = memo(function BackgroundVideo({
  lyricsEnabled,
  lines,
  activeIndex,
  status,
  isFading,
  currentLine,
  nextLine,
}) {
  const activeTheme = usePlayerStore((state) => state.activeTheme);

  return (
    <div className={styles.backgroundVideo}>
      <div className={styles.inner}>
        <video
          key={activeTheme.id}
          autoPlay
          muted
          loop
          playsInline
          className={styles.videoBg}
        >
          <source src={activeTheme.video} type="video/mp4" />
        </video>
        <ParticlesEffect />
        <div className={styles.lyricsArea}>
          <LyricsDisplay
            enabled={lyricsEnabled}
            lines={lines}
            activeIndex={activeIndex}
            status={status}
            isFading={isFading}
            currentLine={currentLine}
            nextLine={nextLine}
          />
        </div>
      </div>
    </div>
  );
});