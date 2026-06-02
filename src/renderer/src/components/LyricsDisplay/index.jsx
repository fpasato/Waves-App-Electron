import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./style.module.css";

const LINGER_MS   = 2000;
const FADE_OUT_MS = 400;

export function LyricsDisplay({
  enabled,
  status,
  isFading,
  currentLine,
  nextLine,
  isGap,
}) {
  const [displayed, setDisplayed] = useState({ line: null, next: null });
  // "hidden" | "entering" | "visible" | "leaving"
  const [phase, setPhase] = useState("hidden");
  const lingerTimer = useRef(null);
  const fadeTimer   = useRef(null);
  const rafRef      = useRef(null);

  const clearTimers = useCallback(() => {
    clearTimeout(lingerTimer.current);
    clearTimeout(fadeTimer.current);
    cancelAnimationFrame(rafRef.current);
  }, []);

  // Monta conteúdo, força repaint, então anima entrada
  const enterWith = useCallback((line, next) => {
    setDisplayed({ line, next });
    setPhase("hidden"); // garante que começa invisível
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        setPhase("entering");
        fadeTimer.current = setTimeout(() => setPhase("visible"), FADE_OUT_MS);
      });
    });
  }, []);

  // Fade-out e depois executa callback
  const leaveWith = useCallback((cb) => {
    setPhase("leaving");
    fadeTimer.current = setTimeout(() => {
      cb?.();
    }, FADE_OUT_MS);
  }, []);

  useEffect(() => {
    // Sem conteúdo nenhum
    if (!currentLine && !isGap) {
      clearTimers();
      if (phase === "hidden") return;
      leaveWith(() => {
        setDisplayed({ line: null, next: null });
        setPhase("hidden");
      });
      return;
    }

    // Gap instrumental: aguarda LINGER_MS antes de sumir
    if (!currentLine && isGap) {
      clearTimers();
      lingerTimer.current = setTimeout(() => {
        leaveWith(() => {
          setDisplayed({ line: null, next: null });
          setPhase("hidden");
        });
      }, LINGER_MS);
      return;
    }

    // Mesma linha — só atualiza next sem animar
    if (currentLine?.text === displayed.line?.text) {
      if (nextLine?.text !== displayed.next?.text) {
        setDisplayed((d) => ({ ...d, next: nextLine ?? null }));
      }
      return;
    }

    // Nova linha e estava oculto: entra direto
    if (phase === "hidden") {
      clearTimers();
      enterWith(currentLine, nextLine ?? null);
      return;
    }

    // Nova linha com uma já visível: sai → entra
    clearTimers();
    leaveWith(() => {
      enterWith(currentLine, nextLine ?? null);
    });

    return () => clearTimers();
  }, [currentLine, nextLine, isGap]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (!enabled) return null;

  const isLeaving  = phase === "leaving";
  const isEntering = phase === "entering" || phase === "visible";
  const nextVisible = isEntering && !isLeaving;

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
          <div
            className={[
              styles.activeLineWrapper,
              isEntering && styles.lineIn,
              isLeaving  && styles.lineOut,
            ].filter(Boolean).join(" ")}
          >
            {displayed.line && (
              <p className={styles.activeLine}>{displayed.line.text}</p>
            )}
            {!displayed.line && isGap && (
              <p className={styles.instrumental}>♫ instrumental ♫</p>
            )}
          </div>

          {displayed.next && (
            <p
              className={[
                styles.nextLine,
                nextVisible ? styles.nextIn : styles.nextOut,
              ].join(" ")}
            >
              {displayed.next.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}