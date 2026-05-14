import { useEffect } from "react";
import { usePlayer } from "../store/PlayerContext";

export function useAnalyser() {
  const { audioRef, crossfadeAudioRef, analyserRef, audioContextRef } = usePlayer();

  // resume no clique/tecla (mantém igual)
  useEffect(() => {
    const resume = () => audioContextRef.current?.state === "suspended"
      && audioContextRef.current.resume();

    document.addEventListener("click", resume);
    document.addEventListener("keydown", resume);
    return () => {
      document.removeEventListener("click", resume);
      document.removeEventListener("keydown", resume);
    };
  }, []);

  // setup roda UMA vez no mount — ambos os elementos já existem no Context
  useEffect(() => {
    if (analyserRef.current) return; // já configurado

    const ctx      = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    const srcA = ctx.createMediaElementSource(audioRef.current);
    const srcB = ctx.createMediaElementSource(crossfadeAudioRef.current);

    srcA.connect(analyser);
    srcB.connect(analyser);
    analyser.connect(ctx.destination);

    audioContextRef.current = ctx;
    analyserRef.current     = analyser;

    // AudioContext começa suspended em browsers modernos;
    // o listener de click/keydown acima vai retomá-lo
  }, []);

  return { analyserRef };
}