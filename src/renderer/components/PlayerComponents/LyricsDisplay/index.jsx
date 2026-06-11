import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../../../store/PlayerContext";
import styles from "./style.module.css";

const LINE_HEIGHT = 45;
const SCROLL_DURATION = 280;
const GHOST_DURATION = 700;

export function LyricsDisplay({ enabled, status, lines, offset, isFading }) {
  const { audioRef, activeAudioRef } = usePlayer();

  const [visual, setVisual] = useState({
    phase: "idle",
    current: null,
    next: null,
    incoming: null,
    activeIdx: -1,
  });

  const rafRef = useRef(0);
  const timerRef = useRef(null);
  const lastActiveIdxRef = useRef(-1);
  const phaseRef = useRef("idle");
  const isRunningRef = useRef(false);

  // Garante que o offset seja número válido
  const safeOffset = Number.isFinite(offset) ? offset : 0;

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
    };
  }, []);

  // Inicialização quando as linhas mudam
  useEffect(() => {
    if (status !== "found" || !lines.length || !enabled) {
      setVisual({
        phase: "idle",
        current: null,
        next: null,
        incoming: null,
        activeIdx: -1,
      });
      lastActiveIdxRef.current = -1;
      phaseRef.current = "idle";
      return;
    }

    const audioEl = activeAudioRef?.current ?? audioRef?.current;
    const currentTime = audioEl ? Math.max(0, audioEl.currentTime + safeOffset) : 0;
    let idx = -1;
    let lo = 0, hi = lines.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lines[mid].time <= currentTime) {
        idx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (idx === -1 && lines.length > 0) idx = 0;

    const cur = lines[idx] ?? null;
    const nxt = idx + 1 < lines.length ? lines[idx + 1] : null;
    const inc = idx + 2 < lines.length ? lines[idx + 2] : null;

    setVisual({
      phase: "idle",
      current: cur,
      next: nxt,
      incoming: inc,
      activeIdx: idx,
    });
    lastActiveIdxRef.current = idx;
    phaseRef.current = "idle";
  }, [status, lines, enabled, safeOffset, audioRef, activeAudioRef]);

  // Loop principal de sincronização
  useEffect(() => {
    if (status !== "found" || !lines.length || !enabled) {
      setVisual({
        phase: "idle",
        current: null,
        next: null,
        incoming: null,
        activeIdx: -1,
      });
      lastActiveIdxRef.current = -1;
      phaseRef.current = "idle";
      return;
    }

    isRunningRef.current = true;

    const tick = () => {
      if (!isRunningRef.current) return;

      const audioEl = activeAudioRef?.current ?? audioRef?.current;
      const currentTime = audioEl ? Math.max(0, audioEl.currentTime + safeOffset) : 0;

      let activeIdx = -1;
      let lo = 0, hi = lines.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lines[mid].time <= currentTime) {
          activeIdx = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      if (!audioEl) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (activeIdx === -1 && lines.length > 0 && currentTime >= 0) {
        activeIdx = 0;
      }

      const prevIdx = lastActiveIdxRef.current;
      if (activeIdx !== prevIdx && phaseRef.current === "idle") {
        const curLine = lines[activeIdx];
        const nextLine = activeIdx + 1 < lines.length ? lines[activeIdx + 1] : null;
        const nextNextLine = activeIdx + 2 < lines.length ? lines[activeIdx + 2] : null;

        if (Math.abs(activeIdx - prevIdx) !== 1 || prevIdx === -1) {
          setVisual({
            phase: "idle",
            current: curLine,
            next: nextLine,
            incoming: nextNextLine,
            activeIdx,
          });
          lastActiveIdxRef.current = activeIdx;
        } else if (activeIdx > prevIdx) {
          clearTimeout(timerRef.current);
          phaseRef.current = "scrolling";
          setVisual((prev) => ({
            phase: "scrolling",
            current: prev.current,
            next: nextLine,
            incoming: nextNextLine,
            activeIdx,
          }));
          timerRef.current = setTimeout(() => {
            setVisual({
              phase: "idle",
              current: nextLine,
              next: nextNextLine,
              incoming: activeIdx + 2 < lines.length ? lines[activeIdx + 2] : null,
              activeIdx,
            });
            lastActiveIdxRef.current = activeIdx;
            phaseRef.current = "idle";
          }, SCROLL_DURATION);
        }
      }

      if (phaseRef.current === "idle" && activeIdx === prevIdx) {
        const nxt = activeIdx + 1 < lines.length ? lines[activeIdx + 1] : null;
        const inc = activeIdx + 2 < lines.length ? lines[activeIdx + 2] : null;
        setVisual((prev) => {
          if (prev.next?.text !== nxt?.text || prev.incoming?.text !== inc?.text) {
            return { ...prev, next: nxt, incoming: inc };
          }
          return prev;
        });
      }

      const currentLine = activeIdx >= 0 ? lines[activeIdx] : null;
      const nextLineObj = activeIdx + 1 < lines.length ? lines[activeIdx + 1] : null;
      const timeSinceStart = currentLine ? currentTime - currentLine.time : Infinity;
      const timeToNext = nextLineObj ? nextLineObj.time - currentTime : Infinity;
      const isGap = timeSinceStart > 4 && timeToNext > 4;

      if (isGap && phaseRef.current === "idle" && activeIdx === prevIdx) {
        phaseRef.current = "ghost";
        clearTimeout(timerRef.current);
        setVisual((prev) => ({ ...prev, phase: "ghost" }));
        timerRef.current = setTimeout(() => {
          phaseRef.current = "idle";
          setVisual((prev) => ({ ...prev, phase: "idle" }));
        }, GHOST_DURATION);
      } else if (!isGap && phaseRef.current === "ghost") {
        clearTimeout(timerRef.current);
        phaseRef.current = "idle";
        setVisual((prev) => ({ ...prev, phase: "idle" }));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      isRunningRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [status, lines, enabled, safeOffset, audioRef, activeAudioRef]);

  if (!enabled) return null;

  const { phase, current, next, incoming } = visual;
  const isScrolling = phase === "scrolling";
  const isGhost = phase === "ghost";

  const currentCls = [
    styles.currentWrapper,
    isGhost
      ? styles.currentGhostOut
      : isScrolling
        ? styles.currentExit
        : current
          ? styles.currentActive
          : styles.currentHidden,
  ].join(" ");

  const nextCls = [
    styles.nextWrapper,
    isScrolling
      ? styles.nextPromote
      : next
        ? styles.nextIdle
        : styles.currentHidden,
  ].join(" ");

  const incomingCls = [
    styles.incomingWrapper,
    isScrolling
      ? styles.incomingEnter
      : incoming
        ? styles.incomingIdle
        : styles.currentHidden,
  ].join(" ");

  return (
    <div className={`${styles.lyricsWrapper} ${isFading ? styles.fading : ""}`}>
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
          <div className={currentCls}>
            {current?.text && (
              <p className={styles.activeText}>{current.text}</p>
            )}
          </div>
          <div className={nextCls}>
            {next?.text && (
              <p
                className={
                  isScrolling ? styles.nextLinePromoted : styles.nextLine
                }
              >
                {next.text}
              </p>
            )}
          </div>
          <div className={incomingCls}>
            {incoming?.text && (
              <p className={styles.nextLine}>{incoming.text}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}