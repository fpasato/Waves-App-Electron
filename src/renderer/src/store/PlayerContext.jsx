// store/PlayerContext.jsx
import { createContext, useContext, useRef } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const crossfadeAudioRef = useRef(null);
  const currentSrcRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);

  return (
    <PlayerContext.Provider
      value={{
        audioRef,
        crossfadeAudioRef,
        currentSrcRef,
        analyserRef,
        audioContextRef,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}