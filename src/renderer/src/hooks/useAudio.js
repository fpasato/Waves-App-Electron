import { useEffect, useRef } from "react";
import { usePlayer } from "../store/PlayerContext";
import { usePlayerStore } from "../store/playerStore";

function resetCrossfadeDeck(secondary, userVolume) {
  if (!secondary) return;
  secondary.pause();
  secondary.removeAttribute("src");
  secondary.load();
  secondary.volume = userVolume;
}

export function useAudio() {
  const { audioRef, crossfadeAudioRef, currentSrcRef, audioContextRef } =
    usePlayer();

  const { currentSong, isPlaying, volume, nextSong } = usePlayerStore();

  if (!audioRef.current) {
    audioRef.current = new Audio();
  }
  if (!crossfadeAudioRef.current) {
    crossfadeAudioRef.current = new Audio();
  }

  const audio = audioRef.current;
  const secondary = crossfadeAudioRef.current;

  const crossfadeActiveRef = useRef(false);
  const suppressPrimaryReloadRef = useRef(false);

  const abortCrossfade = () => {
    crossfadeActiveRef.current = false;
    const v = usePlayerStore.getState().volume;
    resetCrossfadeDeck(secondary, v);
    if (audio) audio.volume = v;
  };

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
  }, [audioContextRef]);

  // =========================
  // SONG ENDED (primary)
  // =========================
  useEffect(() => {
    const onEnded = () => {
      const v = usePlayerStore.getState().volume;

      if (crossfadeActiveRef.current && secondary.src) {
        crossfadeActiveRef.current = false;

        // Pegamos o progresso atual do secundário (que já é a nova música)
        const t = secondary.currentTime;

        // Marcamos que a troca veio do crossfade para o próximo useEffect não dar "load()" do zero
        suppressPrimaryReloadRef.current = true;

        // Atualiza o estado global para a próxima música
        nextSong();

        const after = usePlayerStore.getState().currentSong;
        if (after?.src) {
          // Importante: setamos o SRC mas NÃO chamamos .load() se o browser já estiver com ele em cache
          audio.src = after.src;
          currentSrcRef.current = after.src;
          audio.volume = v;

          // Sincroniza o tempo ANTES do play para evitar o flash de áudio do início da música
          audio.currentTime = t;

          audio.play().catch(console.error);

          // Limpa o secundário sem travar a thread principal
          secondary.pause();
          secondary.src = "";
        }
        return;
      }

      abortCrossfade();
      nextSong();
    };

    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [nextSong, audio, secondary, currentSrcRef]);

  // =========================
  // TIME UPDATE + crossfade
  // =========================
  useEffect(() => {
    const onTimeUpdate = () => {
      const st = usePlayerStore.getState();
      const v = st.volume;

      // A MÁGICA: Durante o crossfade, o secondary é quem manda na barra de progresso.
      // Assim, quando o primary resetar no onEnded, a UI nem percebe porque está olhando pro secondary.
      const isCrossfading = crossfadeActiveRef.current && secondary.src;
      const activeAudio = isCrossfading ? secondary : audio;

      const dur = activeAudio.duration;
      const ct = activeAudio.currentTime;

      // 1. FILTRO DE SANIDADE: Ignora valores inválidos que o áudio cospe durante transições
      if (!dur || isNaN(dur) || !Number.isFinite(dur) || dur <= 0) {
        return;
      }

      // 2. ATUALIZAÇÃO DO STORE (Somente se os dados forem reais)
      const progress = (ct / dur) * 100 || 0;
      st.setProgress(progress);
      st.setCurrentTime(ct);

      // Evita disparar re-renders se a duração não mudou
      if (Math.abs(st.duration - dur) > 0.1) {
        st.setDuration(dur);
      }

      // --- Lógica de Início do Crossfade (Essa continua rodando no PRIMARY) ---
      // Note: O cálculo de fade sempre usa o 'audio' (quem está saindo)
      const primaryDur = audio.duration;
      const primaryCt = audio.currentTime;

      if (!primaryDur || isNaN(primaryDur) || !st.fadeEnabled) {
        if (!isCrossfading) audio.volume = v;
        return;
      }

      const next = st.peekNextSong();
      if (!next?.src || next.src === audio.src) {
        if (!isCrossfading) audio.volume = v;
        return;
      }

      const fadeSec = st.fadeDuration;
      const fadeWindow = Math.min(fadeSec, primaryDur - 0.1);
      const remaining = primaryDur - primaryCt;

      // Se ainda não chegou na janela de fade
      if (remaining > fadeWindow) {
        if (!isCrossfading) audio.volume = v;
        return;
      }

      // Dispara o Crossfade
      if (!crossfadeActiveRef.current) {
        crossfadeActiveRef.current = true;
        secondary.src = next.src;
        secondary.volume = 0;
        secondary.currentTime = 0;
        secondary.play().catch(console.error);
      }

      // Aplica o volume suave em ambos
      const alpha = Math.min(1, Math.max(0, 1 - remaining / fadeWindow));
      audio.volume = v * (1 - alpha);
      secondary.volume = v * alpha;
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    // IMPORTANTE: O secondary também precisa avisar a UI enquanto ele toca!
    secondary.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      secondary.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [audio, secondary]);

  // =========================
  // VOLUME (sem crossfade ativo)
  // =========================
  useEffect(() => {
    if (!crossfadeActiveRef.current) {
      audio.volume = volume;
      if (!secondary.src) secondary.volume = volume;
    }
  }, [volume, audio, secondary]);

  // =========================
  // Carregar faixa no primary (só quando muda a música)
  // =========================
  useEffect(() => {
    if (suppressPrimaryReloadRef.current) {
      suppressPrimaryReloadRef.current = false;
      return;
    }

    abortCrossfade();

    if (!currentSong?.src) {
      audio.pause();
      audio.src = "";
      currentSrcRef.current = null;
      return;
    }

    // Se o src é o mesmo, não resete o áudio!
    // Apenas verifique o play/pause.
    if (currentSrcRef.current === currentSong.src) {
      if (isPlaying) audio.play().catch(console.error);
      return;
    }

    // Só chegamos aqui se a música REALMENTE mudou por um clique manual
    currentSrcRef.current = currentSong.src;
    audio.src = currentSong.src;
    audio.load();
    const onLoaded = async () => {
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }
      if (usePlayerStore.getState().isPlaying)
        audio.play().catch(console.error);
    };
    audio.addEventListener("loadeddata", onLoaded, { once: true });
  }, [
    currentSong?.id,
    currentSong?.src,
    audio,
    audioContextRef,
    currentSrcRef,
  ]);

  // =========================
  // PLAY / PAUSE
  // =========================
  useEffect(() => {
    if (!currentSong) return;
    if (audio.readyState < 2 && !audio.src) return;

    if (isPlaying) {
      audio.play().catch(console.error);
      if (crossfadeActiveRef.current && secondary.src) {
        secondary.play().catch(console.error);
      }
    } else {
      audio.pause();
      secondary.pause();
    }
  }, [isPlaying, currentSong, audio, secondary]);

  function seek(percent) {
    abortCrossfade();
    if (!audio.duration) return;
    audio.currentTime = (percent / 100) * audio.duration;
  }

  return { seek };
}
