import { useEffect, useState, useRef } from "react";
import styles from "./style.module.css";

/*
 * Abordagem: CSS transitions puras, sem estados de animação paralelos.
 * Dois slots fixos (current + next). Quando o índice muda, apenas
 * trocamos o conteúdo e deixamos o CSS fazer o fade/slide.
 * O piscar era causado por múltiplos estados de animação em conflito.
 */
export function LyricsDisplay({
  enabled,
  status,
  isFading,
  currentLine,
  nextLine,
  isGap,
  activeIndex,
}) {
  const [current, setCurrent] = useState(null);
  const [next, setNext]       = useState(null);
  const [visible, setVisible] = useState(false);

  const prevIndexRef = useRef(-2);
  const timerRef     = useRef(null);

  // Reseta ao mudar status
  useEffect(() => {
    if (status !== "found") {
      clearTimeout(timerRef.current);
      setCurrent(null);
      setNext(null);
      setVisible(false);
      prevIndexRef.current = -2;
    }
  }, [status]);

  // Atualiza slots quando o índice muda
  useEffect(() => {
    if (status !== "found") return;

    const effectiveIndex = isGap ? -1 : activeIndex;

    const wantCurrent = isGap
      ? { text: "♫", isInstrumental: true }
      : currentLine
        ? { text: currentLine.text }
        : null;

    // Next só existe quando há linha atual real (não gap, não null)
    const wantNext = (!isGap && currentLine && nextLine)
      ? { text: nextLine.text }
      : null;

    // Primeira renderização — sem animação
    if (prevIndexRef.current === -2) {
      setCurrent(wantCurrent);
      setNext(wantNext);
      timerRef.current = setTimeout(() => setVisible(true), 32);
      prevIndexRef.current = effectiveIndex;
      return;
    }

    // Índice não mudou — só atualiza next silenciosamente
    if (effectiveIndex === prevIndexRef.current) {
      setNext(wantNext);
      return;
    }

    // Índice mudou — troca conteúdo, CSS transition faz o resto
    clearTimeout(timerRef.current);
    setCurrent(wantCurrent);
    setNext(wantNext);
    prevIndexRef.current = effectiveIndex;
  }, [status, isGap, activeIndex, currentLine, nextLine]);

  if (!enabled) return null;

  return (
    <div
      className={`${styles.wrapper} ${isFading ? styles.fading : ""}`}
      aria-live="polite"
    >
      {status === "loading" && (
        <div className={styles.dots}>
          <span /><span /><span />
        </div>
      )}

      {status === "notfound" && (
        <p className={styles.notFound}>letra não encontrada</p>
      )}

      {status === "error" && (
        <p className={styles.notFound}>falha ao buscar letra</p>
      )}

      {status === "found" && (
        <div className={`${styles.stage} ${visible ? styles.stageVisible : ""}`}>
          <div className={styles.currentSlot}>
            {current && (
              <p
                key={current.text}
                className={current.isInstrumental ? styles.instrumental : styles.currentText}
              >
                {current.text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}