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
  } = usePlayer();

  const { currentSong, isPlaying, volume, nextSong } = usePlayerStore();

  // ── INIT ─────────────────────────────────────────────

  const playerA = audioRef.current;
  const playerB = crossfadeAudioRef.current;

  if (!activeAudioRef.current) {
    activeAudioRef.current = playerA;
  }

  function getActive() {
    return activeAudioRef.current;
  }

  function getInactive() {
    return activeAudioRef.current === playerA ? playerB : playerA;
  }

  function resetElement(el) {
    console.log("🧹 [RESET] cleaning element:", el === playerA ? "A" : "B");
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
    if (!fadingRef.current) return;

    console.log("⛔ [ABORT] crossfade aborted");
    fadingRef.current = false;

    resetElement(getInactive());
    getActive().volume = usePlayerStore.getState().volume;
  }

  // ── ENDED ─────────────────────────────────────────────
  const onEndedFnRef = useRef(null);

  onEndedFnRef.current = () => {
    console.log("🎵 [ENDED] triggered");

    if (fadingRef.current) {
      console.log("🎵 [ENDED] during crossfade");

      fadingRef.current = false;
      crossfadeDoneRef.current = true;

      swapActive();
      resetElement(getInactive());
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

  // ── TIMEUPDATE ─────────────────────────────────────────
  useEffect(() => {
    const onTimeUpdate = () => {
      const st = usePlayerStore.getState();
      const active = getActive();

      const dur = active.duration;
      const ct = active.currentTime;

      if (!dur || isNaN(dur) || dur <= 0) return;

      st.setProgress((ct / dur) * 100);
      st.setCurrentTime(ct);

      if (Math.abs(st.duration - dur) > 0.1) {
        st.setDuration(dur);
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
      console.log("⏱️ [TIME]", {
        currentTime: ct,
        currentFormatted: formatTime(ct),

        duration: dur,
        durationFormatted: formatTime(dur),

        percent: dur ? ((ct / dur) * 100).toFixed(2) + "%" : "0%",
      });

      if (remaining > fadeWindow) {
        if (!fadingRef.current) active.volume = st.volume;
        return;
      }

      if (!fadingRef.current) {
        console.log("🎧 [CROSSFADE] START", {
          remaining,
          fadeWindow,
        });

        fadingRef.current = true;

        const entering = getInactive();

        console.log("🎧 [CROSSFADE] loading next src:", next.src);

        entering.src = next.src;
        entering.currentTime = 0;
        entering.volume = 0;

        entering
          .play()
          .catch((e) => console.log("🎧 [CROSSFADE] play error:", e));
      }

      const alpha = Math.min(1, Math.max(0, 1 - remaining / fadeWindow));

      const entering = getInactive();

      active.volume = st.volume * (1 - alpha);
      entering.volume = st.volume * alpha;

      if (alpha >= 0.99) {
        console.log("🎧 [CROSSFADE] COMPLETED");

        fadingRef.current = false;
        crossfadeDoneRef.current = true;

        currentSrcRef.current = next.src;

        const leaving = active;

        swapActive();
        resetElement(leaving);

        console.log("🎧 [CROSSFADE] nextSong()");
        nextSong();
      }
    };
    playerA.addEventListener("timeupdate", onTimeUpdate);
    playerB.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      playerA.removeEventListener("timeupdate", onTimeUpdate);
      playerB.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [playerA, playerB, nextSong]);

  // ── VOLUME ─────────────────────────────────────────────
  useEffect(() => {
    console.log("🔊 [VOLUME] update:", volume);

    if (!fadingRef.current) {
      getActive().volume = volume;
    }
  }, [volume]);

  // ── LOAD SONG ──────────────────────────────────────────
  useEffect(() => {
    if (crossfadeDoneRef.current) {
      console.log("🎧 [LOAD] skipped (crossfade done)");
      // NÃO zera aqui — deixa o [PLAY/PAUSE] consumir
      return;
    }

    if (currentSong?.src === currentSrcRef.current) {
      console.log("🎧 [LOAD] same song");
      if (isPlaying) getActive().play().catch(console.error);
      return;
    }

    abortCrossfade();

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

    resetElement(getInactive());
  }, [currentSong?.id, currentSong?.src]);

  // ── PLAY / PAUSE ──────────────────────────────────────
  useEffect(() => {
    if (!currentSong) return;

    if (crossfadeDoneRef.current) {
      console.log("🎧 [PLAY] skipped (crossfade done)");
      crossfadeDoneRef.current = false; // ← consome a flag aqui, uma única vez
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

  // ── SEEK ───────────────────────────────────────────────
  function seek(percent) {
    console.log("🎧 [SEEK]", percent);

    abortCrossfade();

    const active = getActive();
    if (!active.duration) return;

    active.currentTime = (percent / 100) * active.duration;
  }

  return { seek };

  function formatTime(sec) {
    if (!sec || isNaN(sec) || !isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
}
