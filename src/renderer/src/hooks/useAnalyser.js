import { useEffect } from "react";
import { usePlayer } from "../store/PlayerContext";

export function useAnalyser() {
  const { audioRef, analyserRef, audioContextRef } = usePlayer();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setup = async () => {
      if (audioContextRef.current) {
        // resume se estiver suspenso
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }
        return;
      }

      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }
    };

    audio.addEventListener("play", setup);
    return () => audio.removeEventListener("play", setup);
  }, []);

  return { analyserRef };
}