import { useEffect } from "react";
import { usePlayer } from "../store/PlayerContext";

export function useAudio() {
  const { state, dispatch, audioRef, currentSrcRef } = usePlayer();

  if (!audioRef.current) {
    audioRef.current = new Audio();
  }
  const audio = audioRef.current;

  // =========================
  // SONG ENDED
  // =========================
  useEffect(() => {
    const onEnded = () => dispatch({ type: "NEXT_SONG" });
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, []);

  // =========================
  // TIME UPDATE
  // =========================
  useEffect(() => {
    const onTimeUpdate = () => {
      const progress = (audio.currentTime / audio.duration) * 100 || 0;
      dispatch({ type: "SET_PROGRESS", payload: progress });
      dispatch({ type: "SET_CURRENT_TIME", payload: audio.currentTime });
      dispatch({ type: "SET_DURATION", payload: audio.duration || 0 });
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, []);

  // =========================
  // VOLUME
  // =========================
  useEffect(() => {
    audio.volume = state.volume;
  }, [state.volume]);

  // =========================
  // TROCAR MÚSICA
  // =========================
  useEffect(() => {
    if (!state.currentSong) {
      audio.pause();
      audio.src = "";
      currentSrcRef.current = null;
      return;
    }

    if (currentSrcRef.current === state.currentSong.src) {
      if (state.isPlaying) audio.play().catch(console.error);
      return;
    }

    currentSrcRef.current = state.currentSong.src;
    audio.src = state.currentSong.src;
    audio.load();
    audio.addEventListener("loadeddata", () => {
      audio.play().catch(console.error);
    }, { once: true });
  }, [state.currentSong]);

  // =========================
  // PLAY / PAUSE
  // =========================
  useEffect(() => {
    if (!state.currentSong) return;
    if (audio.readyState < 2) return;

    if (state.isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [state.isPlaying]);

  // =========================
  // SEEK
  // =========================
  function seek(percent) {
    if (!audio.duration) return;
    audio.currentTime = (percent / 100) * audio.duration;
  }

  return { seek };
}