// BackgroundVideo/index.jsx
import { memo } from "react";
import { ParticlesEffect } from "../ParticlesEffect";
import styles from "./style.module.css";

export const BackgroundVideo = memo(function BackgroundVideo() {
  return (
    <div className={styles.backgroundVideo}>
      <ParticlesEffect />
    </div>
  );
});