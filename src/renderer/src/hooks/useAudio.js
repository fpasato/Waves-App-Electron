import { useEffect, useRef } from "react";
import { usePlayer } from "../store/PlayerContext";
import { usePlayerStore } from "../store/playerStore";

export function useAudio() {
  const {
    audioRef,
    crossfadeAudioRef,
    currentSrcRef,
    audioContextRef,
    activeAudioRef,
    fadingRef,
    crossfadeDoneRef,
    seekRef,
  } = usePlayer();

  const { currentSong, isPlaying, volume, nextSong } = usePlayerStore();

  const playerA = audioRef.current;
  const playerB = crossfadeAudioRef.current;

  // Refs auxiliares locais
  const suppressCrossfadeRef = useRef(false);
  const crossfadeBlockedRef = useRef(false);
  const enteringAudioRef = useRef(null);
  const fadeIdRef = useRef(0);

  // Inicializa player ativo
  if (!activeAudioRef.current) {
    activeAudioRef.current = playerA;
  }

  // ---------- UTILITÁRIOS ----------
  function getActive() {
    return activeAudioRef.current;
  }

  function getInactive() {
    return activeAudioRef.current === playerA ? playerB : playerA;
  }

  function resetElement(el, logLabel) {
    console.log(`🧹 [RESET] ${logLabel || (el === playerA ? "A" : "B")}`);
    el.pause();
    el.removeAttribute("src");
    el.load();
    el.volume = usePlayerStore.getState().volume;
  }

  function swapActive() {
    console.log("🔄 [SWAP] active swapped");
    activeAudioRef.current =
      activeAudioRef.current === playerA ? playerB : playerA;
  }

  function abortCrossfade() {
    console.log("⛔ [ABORT] crossfade aborted");
    fadeIdRef.current++;
    fadingRef.current = false;

    const entering = enteringAudioRef.current;
    if (entering) {
      entering.pause();
      entering.currentTime = 0;
      entering.removeAttribute("src");
      entering.load();
    }
    enteringAudioRef.current = null;

    const active = getActive();
    active.volume = usePlayerStore.getState().volume;
  }

  // ---------- EVENTO ENDED ----------
  const onEndedFnRef = useRef(null);
  onEndedFnRef.current = () => {
    console.log("🎵 [ENDED] triggered");
    crossfadeBlockedRef.current = false;

    if (fadingRef.current) {
      console.log("🎵 [ENDED] during crossfade");
      fadingRef.current = false;
      crossfadeDoneRef.current = true;
      swapActive();
      resetElement(getInactive(), "inactive (ended)");
      enteringAudioRef.current = null;
      fadeIdRef.current++;
    }

    console.log("🎵 [ENDED] nextSong()");
    nextSong();
  };

  useEffect(() => {
    const handler = () => onEndedFnRef.current();
    playerA.addEventListener("ended", handler);
    playerB.addEventListener("ended", handler);
    return () => {
      playerA.removeEventListener("ended", handler);
      playerB.removeEventListener("ended", handler);
    };
  }, [playerA, playerB]);

  // ---------- CROSSFADE ----------
  function startCrossfade(nextSrc) {
    if (crossfadeBlockedRef.current) {
      console.log("🚫 [CROSSFADE] blocked (seek occurred)");
      return false;
    }
    if (fadingRef.current) return false;
    if (!usePlayerStore.getState().isPlaying) {
      console.log("🚫 [CROSSFADE] not starting because isPlaying = false");
      return false;
    }

    console.log("🎧 [CROSSFADE] START");
    fadingRef.current = true;
    const fadeId = ++fadeIdRef.current;

    const entering = getInactive();
    enteringAudioRef.current = entering;

    entering.src = nextSrc;
    entering.currentTime = 0;
    entering.volume = 0;

    entering
      .play()
      .then(() => {
        if (
          fadeId !== fadeIdRef.current ||
          !usePlayerStore.getState().isPlaying
        ) {
          console.log(
            "⛔ stale fade play prevented (fadeId mismatch or paused)",
          );
          entering.pause();
          entering.currentTime = 0;
          entering.removeAttribute("src");
          entering.load();
          enteringAudioRef.current = null;
          return;
        }
        console.log("🎧 [CROSSFADE] entering.play() resolved");
      })
      .catch((e) => {
        console.log("🎧 [CROSSFADE] play error:", e);
      });

    return true;
  }

  function updateCrossfadeVolumes(remaining, fadeWindow) {
    const active = getActive();
    const entering = getInactive();
    const st = usePlayerStore.getState();

    const alpha = Math.min(1, Math.max(0, 1 - remaining / fadeWindow));
    active.volume = st.volume * (1 - alpha);
    entering.volume = st.volume * alpha;

    if (alpha >= 0.99) {
      completeCrossfade();
    }
  }

  function completeCrossfade() {
    console.log("🎧 [CROSSFADE] COMPLETED");
    fadingRef.current = false;
    crossfadeDoneRef.current = true;

    const next = usePlayerStore.getState().peekNextSong();
    if (next?.src) currentSrcRef.current = next.src;

    const leaving = getActive();
    swapActive();
    resetElement(leaving, "leaving (completed)");
    enteringAudioRef.current = null;
    nextSong();
  }

  // ---------- TIMEUPDATE ----------
  useEffect(() => {
    const onTimeUpdate = () => {
      const st = usePlayerStore.getState();
      const active = getActive();
      const dur = active.duration;
      const ct = active.currentTime;

      if (!dur || isNaN(dur) || dur <= 0) return;

      st.setProgress((ct / dur) * 100);
      st.setCurrentTime(ct);
      if (Math.abs(st.duration - dur) > 0.1) st.setDuration(dur);

      if (crossfadeBlockedRef.current) {
        if (!fadingRef.current) active.volume = st.volume;
        return;
      }

      if (!st.fadeEnabled) {
        if (!fadingRef.current) active.volume = st.volume;
        return;
      }

      const next = st.peekNextSong();
      if (!next?.src || next.src === active.src) {
        if (!fadingRef.current) active.volume = st.volume;
        return;
      }

      const fadeWindow = Math.min(st.fadeDuration, dur - 0.1);
      const remaining = dur - ct;

      if (remaining > fadeWindow) {
        if (!fadingRef.current) active.volume = st.volume;
        return;
      }

      if (suppressCrossfadeRef.current) {
        if (!fadingRef.current) active.volume = st.volume;
        return;
      }

      if (!fadingRef.current) {
        const started = startCrossfade(next.src);
        if (!started) return;
      }

      updateCrossfadeVolumes(remaining, fadeWindow);
    };

    playerA.addEventListener("timeupdate", onTimeUpdate);
    playerB.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      playerA.removeEventListener("timeupdate", onTimeUpdate);
      playerB.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [playerA, playerB, nextSong]);

  // ---------- VOLUME ----------
  useEffect(() => {
    console.log("🔊 [VOLUME] update:", volume);
    if (!fadingRef.current) {
      getActive().volume = volume;
    }
  }, [volume]);

  // ---------- LOAD SONG ----------
  useEffect(() => {
    if (crossfadeDoneRef.current) {
      console.log("🎧 [LOAD] skipped (crossfade done)");
      return;
    }

    if (currentSong?.src === currentSrcRef.current) {
      console.log("🎧 [LOAD] same song");
      if (isPlaying) getActive().play().catch(console.error);
      return;
    }

    abortCrossfade();
    crossfadeBlockedRef.current = false;
    suppressCrossfadeRef.current = false;

    if (!currentSong?.src) {
      console.log("🎧 [LOAD] empty song");
      playerA.pause();
      playerB.pause();
      playerA.src = "";
      playerB.src = "";
      currentSrcRef.current = null;
      return;
    }

    console.log("🎧 [LOAD] new song:", currentSong.src);
    currentSrcRef.current = currentSong.src;

    const active = getActive();
    active.src = currentSong.src;
    active.load();

    active.addEventListener(
      "loadeddata",
      async () => {
        console.log("🎧 [LOAD] loadeddata");
        if (audioContextRef.current?.state === "suspended") {
          await audioContextRef.current.resume();
        }
        if (usePlayerStore.getState().isPlaying) {
          console.log("🎧 [LOAD] autoplay");
          active.play().catch(console.error);
        }
      },
      { once: true },
    );

    resetElement(getInactive(), "inactive (load)");
  }, [currentSong?.id, currentSong?.src]);

  // ---------- PLAY / PAUSE ----------
  useEffect(() => {
    if (!currentSong) return;

    if (crossfadeDoneRef.current) {
      console.log("🎧 [PLAY] skipped (crossfade done)");
      crossfadeDoneRef.current = false;
      return;
    }

    if (isPlaying) {
      console.log("🎧 [PLAY]");
      getActive().play().catch(console.error);
    } else {
      console.log("🎧 [PAUSE]");
      playerA.pause();
      playerB.pause();
    }
  }, [isPlaying, currentSong?.id]);

  // ---------- SEEK ----------
  function seek(percent) {
    console.log("🎧 [SEEK] percent:", percent);
    const active = getActive();
    if (!active.duration) return;

    // Se estava em crossfade, aborta e bloqueia temporariamente
    if (fadingRef.current) {
      abortCrossfade();

      crossfadeBlockedRef.current = true;
      setTimeout(() => {
        crossfadeBlockedRef.current = false;
        console.log("🔓 [CROSSFADE] unblocked after seek");
      }, 1000); // tempo suficiente para evitar fades reativos imediatos
    }

    // Evita que o timeupdate reinicie o fade nos próximos 300ms
    suppressCrossfadeRef.current = true;
    setTimeout(() => {
      suppressCrossfadeRef.current = false;
    }, 300);

    // Aplica o seek
    const newTime = (percent / 100) * active.duration;
    active.currentTime = newTime;
    active.volume = usePlayerStore.getState().volume;
  }
  // ---------- EXPORTA A FUNÇÃO SEEK VIA REF DO CONTEXTO ----------
  seekRef.current = seek;

  // Retorna vazio, pois o seek já está disponível em seekRef
  return {};
}
