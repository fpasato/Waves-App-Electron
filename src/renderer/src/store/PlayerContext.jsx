// store/PlayerContext.jsx
import { createContext, useContext, useRef } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const crossfadeAudioRef = useRef(null);
  const currentSrcRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const activeAudioRef = useRef(null);
  const fadingRef = useRef(false); 
  const crossfadeDoneRef = useRef(false);

  return (
    <PlayerContext.Provider
      value={{
        audioRef,
        crossfadeAudioRef,
        currentSrcRef,
        analyserRef,
        audioContextRef,
        activeAudioRef,
        fadingRef, 
        crossfadeDoneRef,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
