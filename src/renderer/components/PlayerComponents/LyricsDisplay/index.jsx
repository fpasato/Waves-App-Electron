import { useEffect, useState, useRef } from "react";
import styles from "./style.module.css";

export function LyricsDisplay({
  enabled,
  status,
  isFading,
  currentLine,
  nextLine,
  isGap,
  activeIndex,
}) {
  const [displayCurrent, setDisplayCurrent] = useState(null);
  const [displayNext, setDisplayNext] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [animCurrent, setAnimCurrent] = useState(null);
  const [animNext, setAnimNext] = useState(null);
  const [incomingNext, setIncomingNext] = useState(null);  // NOVO: próxima da próxima

  const lastIndexRef = useRef(-2);
  const displayCurrentRef = useRef(displayCurrent);
  const displayNextRef = useRef(displayNext);
  useEffect(() => { displayCurrentRef.current = displayCurrent; }, [displayCurrent]);
  useEffect(() => { displayNextRef.current = displayNext; }, [displayNext]);

  useEffect(() => {
    if (status !== "found") {
      setDisplayCurrent(null);
      setDisplayNext(null);
      setAnimating(false);
      setIncomingNext(null);
      lastIndexRef.current = -2;
      return;
    }

    const desiredCurrent = isGap
      ? { text: "♫ instrumental ♫", isInstrumental: true }
      : currentLine
        ? { text: currentLine.text }
        : null;
    const desiredNext = nextLine ? { text: nextLine.text } : null;
    const effectiveIndex = isGap ? -1 : activeIndex;

    if (lastIndexRef.current === -2) {
      setDisplayCurrent(desiredCurrent);
      setDisplayNext(desiredNext);
      lastIndexRef.current = effectiveIndex;
      return;
    }

    if (effectiveIndex === lastIndexRef.current) {
      setDisplayNext(desiredNext);
      return;
    }

    // Congela os conteúdos antigos para animar
    const oldCurrent = displayCurrentRef.current;
    const oldNext = displayNextRef.current;
    setAnimCurrent(oldCurrent);
    setAnimNext(oldNext);

    // Define a nova próxima (C) para aparecer imediatamente durante a animação
    setIncomingNext(desiredNext);

    setAnimating(true);

    const timer = setTimeout(() => {
      setDisplayCurrent(desiredCurrent);
      setDisplayNext(desiredNext);
      setAnimating(false);
      setAnimCurrent(null);
      setAnimNext(null);
      setIncomingNext(null);
    }, 280);

    lastIndexRef.current = effectiveIndex;
    return () => clearTimeout(timer);
  }, [currentLine, nextLine, isGap, activeIndex, status]);

  if (!enabled) return null;

  const showCurrent = animating ? animCurrent : displayCurrent;
  const showNext = animating ? animNext : displayNext;

  const currentWrapperClass = animating
    ? styles.currentExit
    : styles.currentIdle;
  const nextWrapperClass = animating
    ? styles.nextPromote
    : styles.nextIdle;

  const nextTextClass = animating
    ? styles.nextLinePromoted
    : styles.nextLine;

  return (
    <div
      className={`${styles.lyricsWrapper} ${isFading ? styles.fading : ""}`}
      aria-live="polite"
    >
      {status === "loading" && (
        <p className={styles.statusText}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </p>
      )}
      {status === "notfound" && (
        <p className={`${styles.statusText} ${styles.notFound}`}>
          letra não encontrada
        </p>
      )}
      {status === "error" && (
        <p className={`${styles.statusText} ${styles.notFound}`}>
          falha ao buscar letra
        </p>
      )}
      {status === "found" && (
        <div className={styles.karaokeView}>
          {/* Slot atual (ou instrumental) */}
          <div className={`${styles.currentWrapper} ${currentWrapperClass}`}>
            {showCurrent && (
              <p
                className={
                  showCurrent.isInstrumental
                    ? styles.instrumental
                    : styles.activeText
                }
              >
                {showCurrent.text}
              </p>
            )}
          </div>

          {/* Slot da próxima linha (sobe durante animação) */}
          <div className={`${styles.nextWrapper} ${nextWrapperClass}`}>
            {showNext && (
              <p className={nextTextClass}>
                {showNext.text}
              </p>
            )}
          </div>

          {/* Slot extra: nova próxima (aparece embaixo durante a animação) */}
          {animating && incomingNext && (
            <div className={styles.incomingWrapper}>
              <p className={styles.nextLine}>{incomingNext.text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}