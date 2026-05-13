import { useEffect } from "react";
import { usePlayer } from "../store/PlayerContext";
import { usePlayerStore } from "../store/playerStore";

export function useAudio() {
  const { audioRef, currentSrcRef, audioContextRef } = usePlayer();
  const {
    currentSong,
    isPlaying,
    volume,
    setProgress,
    setCurrentTime,
    setDuration,
    nextSong,
  } = usePlayerStore();

  if (!audioRef.current) {
    audioRef.current = new Audio();
  }
  const audio = audioRef.current;

  // =========================
  // RESUME AUDIO CONTEXT
  // =========================
  useEffect(() => {
    const resume = () => {
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
    };
    document.addEventListener("click", resume);
    document.addEventListener("keydown", resume);
    return () => {
      document.removeEventListener("click", resume);
      document.removeEventListener("keydown", resume);
    };
  }, []);

  // =========================
  // SONG ENDED
  // =========================
  useEffect(() => {
    const onEnded = () => nextSong();
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [nextSong]);

  // =========================
  // TIME UPDATE
  // =========================
  useEffect(() => {
    const onTimeUpdate = () => {
      const progress = (audio.currentTime / audio.duration) * 100 || 0;
      setProgress(progress);
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, [setProgress, setCurrentTime, setDuration]);

  // =========================
  // VOLUME
  // =========================
  useEffect(() => {
    audio.volume = volume;
  }, [volume]);

  // =========================
  // TROCAR MÚSICA
  // =========================
  useEffect(() => {
    if (!currentSong || !currentSong.src) {
      audio.pause();
      audio.src = "";
      currentSrcRef.current = null;
      return;
    }

    if (currentSrcRef.current === currentSong.src) {
      if (isPlaying) audio.play().catch(console.error);
      else audio.pause();
      return;
    }

    currentSrcRef.current = currentSong.src;
    audio.src = currentSong.src;
    audio.load();
    const onLoaded = async () => {
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }
      if (isPlaying) audio.play().catch(console.error);
    };
    audio.addEventListener("loadeddata", onLoaded, { once: true });
  }, [currentSong, isPlaying]);

  // =========================
  // PLAY / PAUSE
  // =========================
  useEffect(() => {
    if (!currentSong) return;
    if (audio.readyState < 2) return;

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // =========================
  // SEEK
  // =========================
  function seek(percent) {
    if (!audio.duration) return;
    audio.currentTime = (percent / 100) * audio.duration;
  }

  return { seek };
}