import { useEffect } from "react";
import { usePlayerStore } from "../store/playerStore";

/**
 * useShortkeys
 * Registra atalhos globais de teclado para o player.
 *
 * Space        → play / pause
 * →            → próxima música
 * ←            → música anterior
 * Shift + →    → avançar 10s
 * Shift + ←    → retroceder 10s
 * ↑            → volume +10%
 * ↓            → volume -10%
 * R            → toggle repeat
 * S            → shuffle
 * L            → toggle legendas
 * Ctrl + R     → iniciar / parar gravação de rádio
 */

export function useShortkeys() {
  const {
    // reprodução
    isPlaying,
    togglePlay,
    nextSong,
    previousSong,
    seekForward,
    seekBackward,
    // rádio
    playerType,
    radioPlaying,
    currentRadio,
    playRadio,
    pauseRadio,
    // gravação
    isRecording,
    startRecording,
    stopRecording,
    // extras
    toggleRepeat,
    shuffleRemaining,
    toggleLyrics,
    // volume
    volume, 
    setVolume,
  } = usePlayerStore.getState();

  useEffect(() => {
    const handler = (e) => {
      // Não dispara atalhos quando o foco está em inputs, textareas, selects, etc.
      const tag = document.activeElement?.tagName ?? "";
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;

      const isRadio = usePlayerStore.getState().playerType === "radio";

      switch (true) {
        // ── Play / Pause ──────────────────────────────────────────────
        case e.code === "Space": {
          e.preventDefault();
          const state = usePlayerStore.getState();
          if (state.playerType === "radio") {
            state.radioPlaying
              ? state.pauseRadio()
              : state.playRadio(state.currentRadio);
          } else {
            state.togglePlay();
          }
          break;
        }

        // ── Próxima / Anterior ────────────────────────────────────────
        case e.key === "ArrowRight" && !e.shiftKey && !isRadio: {
          e.preventDefault();
          usePlayerStore.getState().nextSong();
          break;
        }
        case e.key === "ArrowLeft" && !e.shiftKey && !isRadio: {
          e.preventDefault();
          usePlayerStore.getState().previousSong();
          break;
        }

        // ── Seek 10s ──────────────────────────────────────────────────
        case e.key === "ArrowRight" && e.shiftKey && !isRadio: {
          e.preventDefault();
          usePlayerStore.getState().seekForward(10);
          break;
        }
        case e.key === "ArrowLeft" && e.shiftKey && !isRadio: {
          e.preventDefault();
          usePlayerStore.getState().seekBackward(10);
          break;
        }

        // ── Volume ────────────────────────────────────────────────────
        case e.key === "ArrowUp": {
          e.preventDefault();
          const { volume, setVolume } = usePlayerStore.getState();
          setVolume(Math.min(1, parseFloat((volume + 0.1).toFixed(1))));
          break;
        }
        case e.key === "ArrowDown": {
          e.preventDefault();
          const { volume, setVolume } = usePlayerStore.getState();
          setVolume(Math.max(0, parseFloat((volume - 0.1).toFixed(1))));
          break;
        }

        // ── Repeat ───────────────────────────────────────────────────
        case e.key === "r" && !e.ctrlKey && !e.metaKey && !isRadio: {
          usePlayerStore.getState().toggleRepeat();
          break;
        }

        // ── Shuffle ───────────────────────────────────────────────────
        case e.key === "s" && !e.ctrlKey && !e.metaKey && !isRadio: {
          usePlayerStore.getState().shuffleRemaining();
          break;
        }

        // ── Legendas ──────────────────────────────────────────────────
        case e.key === "l" && !e.ctrlKey && !e.metaKey && !isRadio: {
          usePlayerStore.getState().toggleLyrics();
          break;
        }

        // ── Gravar rádio (Ctrl + R) ───────────────────────────────────
        case e.key === "r" && (e.ctrlKey || e.metaKey): {
          e.preventDefault(); // evita reload no browser
          const state = usePlayerStore.getState();
          if (state.playerType !== "radio" || !state.radioPlaying) break;
          state.isRecording ? state.stopRecording() : state.startRecording();
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // sem deps — lê o estado fresco via getState() dentro do handler
}