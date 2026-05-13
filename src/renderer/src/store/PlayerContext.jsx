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
  shuffleQueue: [],
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

      // =========================
      // FILA VAZIA
      // =========================
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
        const currentShufflePos = state.shuffleQueue.indexOf(state.queueIndex);

        const nextShufflePos = currentShufflePos + 1;

        // =========================
        // FIM DO SHUFFLE
        // =========================
        if (nextShufflePos >= state.shuffleQueue.length) {
          // repeat ligado
          if (state.repeat) {
            const reshuffled = [...state.shuffleQueue].sort(
              () => Math.random() - 0.5,
            );

            const firstIndex = reshuffled[0];

            return {
              ...state,
              queueIndex: firstIndex,
              currentSong: state.queue[firstIndex],
              shuffleQueue: reshuffled,
              isPlaying: true,
            };
          }

          return {
            ...state,
            currentSong: null,
            isPlaying: false,
            progress: 0,
            currentTime: 0,
          };
        }

        const nextIndex = state.shuffleQueue[nextShufflePos];

        return {
          ...state,
          queueIndex: nextIndex,
          currentSong: state.queue[nextIndex],
          isPlaying: true,
        };
      }

      // =========================
      // NORMAL
      // =========================
      const nextIndex = state.queueIndex + 1;

      // =========================
      // FIM DA FILA
      // =========================
      if (nextIndex >= state.queue.length) {
        if (state.repeat) {
          return {
            ...state,
            queueIndex: 0,
            currentSong: state.queue[0],
            isPlaying: true,
          };
        }

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

    case "TOGGLE_SHUFFLE": {
      // =========================
      // ATIVANDO SHUFFLE
      // =========================
      if (!state.shuffle) {
        const indices = state.queue
          .map((_, i) => i)
          .filter((i) => i !== state.queueIndex);

        const shuffled = indices.sort(() => Math.random() - 0.5);

        return {
          ...state,
          shuffle: true,

          // música atual sempre primeiro
          shuffleQueue: [state.queueIndex, ...shuffled],
        };
      }

      // =========================
      // DESATIVANDO SHUFFLE
      // =========================
      return {
        ...state,
        shuffle: false,
        shuffleQueue: [],
      };
    }

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

    case "ADD_TO_QUEUE": {
      console.log(
        "ADD_TO_QUEUE | queueIndex atual:",
        state.queueIndex,
        "| queue atual:",
        state.queue.length,
      );

      const newQueue = [...state.queue, action.payload];

      const newIndex = newQueue.length - 1;

      // =========================
      // SHUFFLE ATIVO
      // =========================
      if (state.shuffle) {
        const currentPos = state.shuffleQueue.indexOf(state.queueIndex);

        const insertPos =
          Math.floor(Math.random() * (state.shuffleQueue.length - currentPos)) +
          currentPos +
          1;

        const newShuffleQueue = [...state.shuffleQueue];

        newShuffleQueue.splice(insertPos, 0, newIndex);

        return {
          ...state,
          queue: newQueue,
          shuffleQueue: newShuffleQueue,
        };
      }

      return {
        ...state,
        queue: newQueue,
      };
    }

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
