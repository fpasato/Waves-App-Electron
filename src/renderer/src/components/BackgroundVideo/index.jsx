// BackgroundVideo/index.jsx
import { memo } from "react";
import { ParticlesEffect } from "../ParticlesEffect";
import styles from "./style.module.css";
import bgVideo from "../../assets/bg.mp4";

export const BackgroundVideo = memo(function BackgroundVideo() {
  return (
    <div className={styles.backgroundVideo}>
      <div className={styles.inner}>
        <video autoPlay muted loop playsInline className={styles.videoBg}>
          <source src={bgVideo} type="video/mp4" />
        </video>
        <ParticlesEffect />
      </div>
    </div>
  );
});