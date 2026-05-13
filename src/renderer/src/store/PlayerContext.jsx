import { createContext, useContext, useReducer, useRef } from "react";

const PlayerContext = createContext(null);

// =========================
// INITIAL STATE
// =========================

const initialState = {
  currentSong: null,

  isPlaying: false,

  volume: 1,

  progress: 0,
  currentTime: 0,
  duration: 0,

  library: [],
  queue: [],
  queueIndex: 0,

  shuffle: false,
  repeat: false,
};

// =========================
// REDUCER
// =========================

function playerReducer(state, action) {
  switch (action.type) {
    // =========================
    // SONG CONTROL
    // =========================

    case "SET_SONG": {
      const index = state.queue.findIndex(
        (song) => song.id === action.payload.id,
      );

      return {
        ...state,
        currentSong: action.payload,
        isPlaying: true,
        queueIndex: index >= 0 ? index : 0,
      };
    }

    case "NEXT_SONG": {
      console.log(
        "NEXT_SONG | queueIndex:",
        state.queueIndex,
        "| queue.length:",
        state.queue.length,
      );

      if (state.queue.length === 0) {
        return {
          ...state,
          currentSong: null,
          isPlaying: false,
        };
      }

      // =========================
      // SHUFFLE
      // =========================
      if (state.shuffle) {
        const randomIndex = Math.floor(Math.random() * state.queue.length);

        return {
          ...state,
          queueIndex: randomIndex,
          currentSong: state.queue[randomIndex],
          isPlaying: true,
        };
      }

      const nextIndex = state.queueIndex + 1;

      // =========================
      // FIM DA FILA
      // =========================
      if (nextIndex >= state.queue.length) {
        // LOOP PLAYLIST
        if (state.repeat) {
          return {
            ...state,
            queueIndex: 0,
            currentSong: state.queue[0],
            isPlaying: true,
          };
        }

        // FINALIZA PLAYER
        return {
          ...state,
          currentSong: null,
          isPlaying: false,
          progress: 0,
          currentTime: 0,
        };
      }

      // =========================
      // PRÓXIMA MÚSICA
      // =========================
      return {
        ...state,
        queueIndex: nextIndex,
        currentSong: state.queue[nextIndex],
        isPlaying: true,
      };
    }

    case "PREVIOUS_SONG": {
      if (state.queue.length === 0) {
        return state;
      }

      const prevIndex = state.queueIndex - 1;

      if (prevIndex < 0) {
        return state;
      }

      return {
        ...state,
        queueIndex: prevIndex,
        currentSong: state.queue[prevIndex],
        isPlaying: true,
      };
    }

    case "STOP":
      return {
        ...state,
        currentSong: null,
        isPlaying: false,

        progress: 0,
        currentTime: 0,
        duration: 0,
      };

    // =========================
    // PLAYBACK
    // =========================

    case "TOGGLE_PLAY": {
      if (!state.currentSong && state.queue.length > 0) {
        return {
          ...state,
          currentSong: state.queue[state.queueIndex],
          isPlaying: true,
          // queueIndex continua 0, correto
        };
      }
      return { ...state, isPlaying: !state.isPlaying };
    }

    case "SET_PLAYING": // executa isso quando isPlaying já é true
      return {
        ...state,
        isPlaying: action.payload, // action.payload é undefined!
      };

    case "TOGGLE_SHUFFLE":
      return {
        ...state,
        shuffle: !state.shuffle,
      };

    case "TOGGLE_REPEAT":
      return {
        ...state,
        repeat: !state.repeat,
      };

    // =========================
    // TIME / PROGRESS
    // =========================

    case "SET_PROGRESS":
      return {
        ...state,
        progress: action.payload,
      };

    case "SET_CURRENT_TIME":
      return {
        ...state,
        currentTime: action.payload,
      };

    case "SET_DURATION":
      return {
        ...state,
        duration: action.payload,
      };

    // =========================
    // LIBRARY
    // =========================

    case "SET_LIBRARY":
      return {
        ...state,
        library: action.payload,
      };

    // =========================
    // QUEUE
    // =========================

    case "SET_QUEUE":
      return {
        ...state,
        queue: action.payload,
      };

    case "ADD_TO_QUEUE":
      console.log(
        "ADD_TO_QUEUE | queueIndex atual:",
        state.queueIndex,
        "| queue atual:",
        state.queue.length,
      );

      return {
        ...state,
        queue: [...state.queue, action.payload],
      };

    case "REMOVE_FROM_QUEUE":
      return {
        ...state,
        queue: state.queue.filter((_, index) => index !== action.payload),
      };

    case "CLEAR_QUEUE":
      return {
        ...state,
        queue: [],
        queueIndex: 0,
      };

    // =========================
    // DEFAULT
    // =========================

    default:
      return state;
  }
}

// =========================
// PROVIDER
// =========================

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);

  const audioRef = useRef(null);
  const currentSrcRef = useRef(null);

  // evita recarregar mesma música
  const loadedSrcRef = useRef(null);
  // PlayerContext.jsx
  const loadingRef = useRef(false);

  return (
    <PlayerContext.Provider
      value={{
        state,
        dispatch,
        audioRef,
        loadedSrcRef,
        loadingRef,
        currentSrcRef,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

// =========================
// HOOK
// =========================

export function usePlayer() {
  return useContext(PlayerContext);
}
