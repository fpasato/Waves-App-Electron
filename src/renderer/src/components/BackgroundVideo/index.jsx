// BackgroundVideo/index.jsx  ← versão atualizada
import { memo } from "react";
import { ParticlesEffect } from "../ParticlesEffect";
import { LyricsDisplay } from "../LyricsDisplay";
import styles from "./style.module.css";
import bgVideo from "../../assets/bg.mp4";

/**
 * Props:
 *   lyricsEnabled  boolean  — vem do estado do player (toggle)
 */
export const BackgroundVideo = memo(function BackgroundVideo({
  lyricsEnabled,
  lines,
  activeIndex,
  status,
  isFading,
  currentLine,
  nextLine,
}) {
  return (
    <div className={styles.backgroundVideo}>
      <div className={styles.inner}>
        <video autoPlay muted loop playsInline className={styles.videoBg}>
          <source src={bgVideo} type="video/mp4" />
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