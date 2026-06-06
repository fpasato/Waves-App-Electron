import { createContext, useContext, useRef, useState, useCallback } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio());
  const crossfadeAudioRef = useRef(new Audio());
  const currentSrcRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const activeAudioRef = useRef(null);
  const fadingRef = useRef(false);
  const crossfadeDoneRef = useRef(false);
  const seekRef = useRef(null);
  audioRef.current.crossOrigin = "anonymous";
  crossfadeAudioRef.current.crossOrigin = "anonymous";


  return (
    <PlayerContext.Provider value={{
      audioRef,
      crossfadeAudioRef,
      currentSrcRef,
      analyserRef,
      audioContextRef,
      activeAudioRef,
      fadingRef,
      crossfadeDoneRef,
      seekRef,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}