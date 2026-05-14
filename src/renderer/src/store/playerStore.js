import { create } from "zustand";
import {
  refreshLibraryFromDisk,
  reloadLibraryFromDb,
} from "../lib/syncLibrary";

// Helper para log com timestamp
function logWithTime(...args) {
  const now = new Date();
  const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now.getMilliseconds().toString().padStart(3, "0")}`;
  console.log(`[${timestamp}]`, ...args);
}

// --- Embaralhamento Fisher-Yates ---
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const usePlayerStore = create((set, get) => ({
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
  shufflePos: 0, // posição atual dentro da shuffleQueue

  fadeEnabled: false,
  fadeDuration: 3,

  setFadeEnabled: (fadeEnabled) => {
    logWithTime(`⚙️ setFadeEnabled: ${fadeEnabled}`);
    set({ fadeEnabled });
  },
  setFadeDuration: (value) => {
    const newVal = Math.min(15, Math.max(1, Math.floor(Number(value)) || 3));
    logWithTime(`⚙️ setFadeDuration: ${value} -> ${newVal}`);
    set({ fadeDuration: newVal });
  },

  loadPlaybackSettings: async () => {
    logWithTime(`⚙️ loadPlaybackSettings iniciado`);
    if (typeof window === "undefined" || !window.api?.settings) return;
    try {
      const en = await window.api.settings.get("fadeEnabled");
      const du = await window.api.settings.get("fadeDuration");
      const parsed = parseInt(du ?? "3", 10);
      const newFadeEnabled = en === "true";
      const newFadeDuration = Math.min(
        15,
        Math.max(1, Number.isFinite(parsed) ? parsed : 3),
      );
      logWithTime(
        `⚙️ loadPlaybackSettings: fadeEnabled=${newFadeEnabled}, fadeDuration=${newFadeDuration}`,
      );
      set({
        fadeEnabled: newFadeEnabled,
        fadeDuration: newFadeDuration,
      });
    } catch (e) {
      logWithTime(`⚙️ loadPlaybackSettings erro:`, e);
    }
  },

  setLibrary: (library) => {
    logWithTime(`📚 setLibrary: ${library.length} músicas`);
    set({ library });
  },
  syncLibraryWithDatabase: async () => {
    logWithTime(`🔄 syncLibraryWithDatabase iniciado`);
    const songs = await refreshLibraryFromDisk();
    logWithTime(
      `🔄 syncLibraryWithDatabase finalizado: ${songs.length} músicas`,
    );
    set({ library: songs });
    return songs;
  },
  reloadLibraryFromDatabase: async () => {
    logWithTime(`🔄 reloadLibraryFromDatabase iniciado`);
    const songs = await reloadLibraryFromDb();
    logWithTime(
      `🔄 reloadLibraryFromDatabase finalizado: ${songs.length} músicas`,
    );
    set({ library: songs });
    return songs;
  },

  // ---------- playSong (preserva shuffle, recria shuffleQueue se necessário) ----------
  playSong: (song, queueArg) => {
    logWithTime(
      `▶️ playSong: ${song.title} | queueArg fornecido? ${!!queueArg}`,
    );
    const { shuffle } = get();
    const finalQueue = queueArg?.length ? queueArg : [song];
    const index = finalQueue.findIndex((s) => s.id === song.id);
    const queueIndex = index >= 0 ? index : 0;
    const current = finalQueue[queueIndex];

    let shuffleQueue = [];
    let shufflePos = 0;
    if (shuffle) {
      const allIndices = finalQueue.map((_, i) => i);
      const shuffled = shuffleArray(allIndices);
      shuffleQueue = shuffled.filter((i) => i !== queueIndex);
      shuffleQueue.unshift(queueIndex);
      shufflePos = 0;
      logWithTime(
        `▶️ playSong: shuffle ativo, nova shuffleQueue = ${JSON.stringify(shuffleQueue)}`,
      );
    }

    set({
      queue: finalQueue,
      queueIndex,
      currentSong: current,
      isPlaying: true,
      shuffleQueue,
      shufflePos,
    });
    logWithTime(
      `▶️ playSong estado final: queueIndex=${queueIndex}, currentSong=${current.title}, shuffle=${shuffle}, shufflePos=${shufflePos}`,
    );
  },

  setSong: (song) => {
    logWithTime(`🎵 setSong: ${song.title}`);
    const { queue, shuffle, shuffleQueue, playSong } = get();
    const index = queue.findIndex((s) => s.id === song.id);
    if (index < 0) {
      logWithTime(`🎵 setSong: música não está na fila, chamando playSong`);
      playSong(song, [...queue, song]);
      return;
    }

    let shufflePos = 0;
    if (shuffle && shuffleQueue.length) {
      const pos = shuffleQueue.indexOf(index);
      if (pos !== -1) {
        shufflePos = pos;
        logWithTime(
          `🎵 setSong: shuffle ativo, nova shufflePos=${shufflePos} (encontrado na posição ${pos})`,
        );
      } else {
        logWithTime(
          `🎵 setSong: shuffle ativo mas índice ${index} não está na shuffleQueue, recriando shuffleQueue`,
        );
        const allIndices = queue.map((_, i) => i);
        const shuffled = shuffleArray(allIndices);
        const newShuffleQueue = shuffled.filter((i) => i !== index);
        newShuffleQueue.unshift(index);
        shufflePos = 0;
        return set({
          currentSong: song,
          isPlaying: true,
          queueIndex: index,
          shuffleQueue: newShuffleQueue,
          shufflePos,
        });
      }
    } else {
      logWithTime(
        `🎵 setSong: shuffle desligado ou shuffleQueue vazia, shufflePos permanece 0`,
      );
    }

    set({
      currentSong: song,
      isPlaying: true,
      queueIndex: index,
      shufflePos,
    });
    logWithTime(
      `🎵 setSong final: queueIndex=${index}, shufflePos=${shufflePos}`,
    );
  },

  // ---------- peekNextSong (usado no crossfade) ----------
  peekNextSong: () => {
    const { queue, queueIndex, shuffle, repeat, shuffleQueue, shufflePos } =
      get();
    logWithTime(
      `👀 peekNextSong: queue.length=${queue.length}, queueIndex=${queueIndex}, shuffle=${shuffle}, repeat=${repeat}, shufflePos=${shufflePos}`,
    );
    if (queue.length === 0) {
      logWithTime(`👀 peekNextSong: fila vazia -> null`);
      return null;
    }

    if (shuffle) {
      const nextPos = shufflePos + 1;
      if (nextPos >= shuffleQueue.length) {
        if (repeat) {
          const nextIndex = shuffleQueue[0];
          logWithTime(
            `👀 peekNextSong (shuffle+repeat): fim da shuffleQueue, volta para índice ${nextIndex}`,
          );
          return queue[nextIndex] ?? null;
        }
        logWithTime(
          `👀 peekNextSong (shuffle, sem repeat): fim da shuffleQueue -> null`,
        );
        return null;
      }
      const nextIndex = shuffleQueue[nextPos];
      logWithTime(
        `👀 peekNextSong (shuffle): próxima posição ${nextPos} -> queueIndex ${nextIndex} (${queue[nextIndex]?.title})`,
      );
      return queue[nextIndex] ?? null;
    }

    const nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeat) {
        logWithTime(
          `👀 peekNextSong (normal+repeat): fim da fila, volta para índice 0`,
        );
        return queue[0] ?? null;
      }
      logWithTime(`👀 peekNextSong (normal): fim da fila -> null`);
      return null;
    }
    logWithTime(
      `👀 peekNextSong (normal): próximo índice ${nextIndex} (${queue[nextIndex]?.title})`,
    );
    return queue[nextIndex] ?? null;
  },

  // ---------- nextSong (usa shufflePos) ----------
  nextSong: () => {
    logWithTime(`⏩ nextSong chamado`);
    const { queue, queueIndex, shuffle, repeat, shuffleQueue, shufflePos } =
      get();
    if (queue.length === 0) {
      logWithTime(`⏩ nextSong: fila vazia -> parando`);
      return set({ currentSong: null, isPlaying: false });
    }

    if (shuffle) {
      const nextPos = shufflePos + 1;
      logWithTime(
        `⏩ nextSong (shuffle): shufflePos atual=${shufflePos}, nextPos=${nextPos}, shuffleQueue.length=${shuffleQueue.length}`,
      );
      if (nextPos >= shuffleQueue.length) {
        if (repeat) {
          const allIndices = queue.map((_, i) => i);
          let newShuffle = shuffleArray(allIndices);

          // Evita que a nova shuffleQueue comece com a mesma música que acabou de tocar
          if (newShuffle[0] === queueIndex && newShuffle.length > 1) {
            const swapWith =
              1 + Math.floor(Math.random() * (newShuffle.length - 1));
            [newShuffle[0], newShuffle[swapWith]] = [
              newShuffle[swapWith],
              newShuffle[0],
            ];
          }

          const firstIndex = newShuffle[0];
          logWithTime(
            `⏩ nextSong (shuffle+repeat): nova shuffleQueue = ${JSON.stringify(newShuffle)}, primeiro índice=${firstIndex} (${queue[firstIndex]?.title})`,
          );
          return set({
            shuffleQueue: newShuffle,
            shufflePos: 0,
            queueIndex: firstIndex,
            currentSong: queue[firstIndex],
            isPlaying: true,
          });
        }
        logWithTime(
          `⏩ nextSong (shuffle, sem repeat): fim da shuffleQueue -> parando`,
        );
        return set({
          currentSong: null,
          isPlaying: false,
          progress: 0,
          currentTime: 0,
        });
      }
      const nextIndex = shuffleQueue[nextPos];
      logWithTime(
        `⏩ nextSong (shuffle): avançando para shufflePos=${nextPos}, queueIndex=${nextIndex} (${queue[nextIndex]?.title})`,
      );
      return set({
        shufflePos: nextPos,
        queueIndex: nextIndex,
        currentSong: queue[nextIndex],
        isPlaying: true,
      });
    }

    // modo normal (sem shuffle)
    const nextIndex = queueIndex + 1;
    logWithTime(
      `⏩ nextSong (normal): queueIndex atual=${queueIndex}, próximo índice=${nextIndex}`,
    );
    if (nextIndex >= queue.length) {
      if (repeat) {
        logWithTime(
          `⏩ nextSong (normal+repeat): fim da fila, volta para índice 0 (${queue[0]?.title})`,
        );
        return set({
          queueIndex: 0,
          currentSong: queue[0],
          isPlaying: true,
        });
      }
      logWithTime(`⏩ nextSong (normal, sem repeat): fim da fila -> parando`);
      return set({
        currentSong: null,
        isPlaying: false,
        progress: 0,
        currentTime: 0,
      });
    }
    logWithTime(
      `⏩ nextSong (normal): nova música: ${queue[nextIndex]?.title}`,
    );
    set({
      queueIndex: nextIndex,
      currentSong: queue[nextIndex],
      isPlaying: true,
    });
  },

  // ---------- previousSong (usa shufflePos) ----------
  previousSong: () => {
    logWithTime(`⏪ previousSong chamado`);
    const { queue, shuffle, shuffleQueue, shufflePos } = get();
    if (queue.length === 0) {
      logWithTime(`⏪ previousSong: fila vazia -> ignorando`);
      return;
    }

    if (shuffle) {
      const prevPos = shufflePos - 1;
      logWithTime(
        `⏪ previousSong (shuffle): shufflePos atual=${shufflePos}, prevPos=${prevPos}`,
      );
      if (prevPos < 0) {
        logWithTime(
          `⏪ previousSong (shuffle): já no início da shuffleQueue -> ignorando`,
        );
        return;
      }
      const prevIndex = shuffleQueue[prevPos];
      logWithTime(
        `⏪ previousSong (shuffle): retrocedendo para shufflePos=${prevPos}, queueIndex=${prevIndex} (${queue[prevIndex]?.title})`,
      );
      return set({
        shufflePos: prevPos,
        queueIndex: prevIndex,
        currentSong: queue[prevIndex],
        isPlaying: true,
      });
    }

    const { queueIndex } = get();
    const prevIndex = queueIndex - 1;
    logWithTime(
      `⏪ previousSong (normal): queueIndex atual=${queueIndex}, prevIndex=${prevIndex}`,
    );
    if (prevIndex < 0) {
      logWithTime(
        `⏪ previousSong (normal): já no início da fila -> ignorando`,
      );
      return;
    }
    logWithTime(
      `⏪ previousSong (normal): nova música: ${queue[prevIndex]?.title}`,
    );
    set({
      queueIndex: prevIndex,
      currentSong: queue[prevIndex],
      isPlaying: true,
    });
  },

  stop: () => {
    logWithTime(`⏹️ stop chamado`);
    set({
      currentSong: null,
      isPlaying: false,
      progress: 0,
      currentTime: 0,
      duration: 0,
    });
  },

  togglePlay: () => {
    logWithTime(`⏯️ togglePlay`);
    const { currentSong, queue, queueIndex, isPlaying } = get();
    if (!currentSong && queue.length > 0) {
      logWithTime(
        `⏯️ togglePlay: sem currentSong, iniciando primeira música da fila`,
      );
      return set({ currentSong: queue[queueIndex], isPlaying: true });
    }
    logWithTime(
      `⏯️ togglePlay: isPlaying passará de ${isPlaying} para ${!isPlaying}`,
    );
    set({ isPlaying: !isPlaying });
  },

  setPlaying: (value) => {
    logWithTime(`🔊 setPlaying: ${value}`);
    set({ isPlaying: value });
  },

  // ---------- toggleShuffle ----------
  toggleShuffle: () => {
    logWithTime(`🔀 toggleShuffle`);
    const { shuffle, queue, queueIndex } = get();
    if (!shuffle) {
      const allIndices = queue.map((_, i) => i);
      const shuffled = shuffleArray(allIndices);
      const newShuffleQueue = shuffled.filter((i) => i !== queueIndex);
      newShuffleQueue.unshift(queueIndex);
      logWithTime(
        `🔀 toggleShuffle: ativando shuffle. nova shuffleQueue = ${JSON.stringify(newShuffleQueue)}`,
      );
      set({
        shuffle: true,
        shuffleQueue: newShuffleQueue,
        shufflePos: 0,
      });
    } else {
      logWithTime(`🔀 toggleShuffle: desativando shuffle`);
      set({
        shuffle: false,
        shuffleQueue: [],
        shufflePos: 0,
      });
    }
  },

  toggleRepeat: () => {
    const { repeat } = get();
    logWithTime(`🔁 toggleRepeat: ${repeat} -> ${!repeat}`);
    set({ repeat: !repeat });
  },

  setProgress: (value) => {
    // log muito frequente, opcional – descomente se precisar
    // logWithTime(`📊 setProgress: ${value}%`);
    set({ progress: value });
  },
  setCurrentTime: (value) => {
    // logWithTime(`⏱️ setCurrentTime: ${value}s`);
    set({ currentTime: value });
  },
  setDuration: (value) => {
    logWithTime(`⏱️ setDuration: ${value}s`);
    set({ duration: value });
  },

  setQueue: (queue) => {
    logWithTime(
      `📃 setQueue: ${queue?.length || 0} músicas | resetando shuffle`,
    );
    set({
      queue: queue ?? [],
      queueIndex: 0,
      currentSong: queue?.[0] ?? null,
      isPlaying: true, // ← adiciona
      shuffle: false,
      shuffleQueue: [],
      shufflePos: 0,
    });
  },

  // ---------- addToQueue (mantém shufflePos consistente) ----------
  addToQueue: (song) => {
    logWithTime(`➕ addToQueue: ${song.title}`);
    const { queue, shuffle, shuffleQueue, shufflePos, queueIndex } = get();
    const newQueue = [...queue, song];
    const newIndex = newQueue.length - 1;

    if (shuffle) {
      const insertPos =
        shufflePos +
        1 +
        Math.floor(Math.random() * (shuffleQueue.length - shufflePos));
      const newShuffle = [...shuffleQueue];
      newShuffle.splice(insertPos, 0, newIndex);
      logWithTime(
        `➕ addToQueue (shuffle): insertPos=${insertPos}, nova shuffleQueue length=${newShuffle.length}`,
      );
      set({
        queue: newQueue,
        shuffleQueue: newShuffle,
      });
    } else {
      logWithTime(
        `➕ addToQueue (normal): nova fila length=${newQueue.length}`,
      );
      set({ queue: newQueue });
    }
  },

  // ---------- removeFromQueue (ajusta shuffleQueue e shufflePos) ----------
  removeFromQueue: (index) =>
    set((state) => {
      logWithTime(
        `➖ removeFromQueue: removendo índice ${index} (${state.queue[index]?.title})`,
      );
      if (index < 0 || index >= state.queue.length) return state;
      const queue = state.queue.filter((_, i) => i !== index);
      let queueIndex = state.queueIndex;
      if (index < state.queueIndex) queueIndex -= 1;
      else if (index === state.queueIndex)
        queueIndex = Math.min(queueIndex, queue.length - 1);
      queueIndex = Math.max(0, queueIndex);

      if (queue.length === 0) {
        logWithTime(`➖ removeFromQueue: fila ficou vazia, resetando tudo`);
        return {
          queue: [],
          queueIndex: 0,
          currentSong: null,
          isPlaying: false,
          progress: 0,
          currentTime: 0,
          duration: 0,
          shuffle: false,
          shuffleQueue: [],
          shufflePos: 0,
        };
      }

      let shuffleQueue = state.shuffleQueue;
      let shufflePos = state.shufflePos;
      if (state.shuffle && shuffleQueue.length) {
        const removedPos = shuffleQueue.indexOf(index);
        logWithTime(
          `➖ removeFromQueue (shuffle): removedPos=${removedPos}, shufflePos atual=${shufflePos}`,
        );
        shuffleQueue = shuffleQueue
          .filter((i) => i !== index)
          .map((i) => (i > index ? i - 1 : i));
        if (removedPos !== -1) {
          if (removedPos < state.shufflePos) {
            shufflePos = state.shufflePos - 1;
            logWithTime(
              `➖ removeFromQueue: removedPos antes do shufflePos, novo shufflePos=${shufflePos}`,
            );
          } else if (removedPos === state.shufflePos) {
            if (shuffleQueue.length > 0) {
              shufflePos = Math.min(shufflePos, shuffleQueue.length - 1);
              queueIndex = shuffleQueue[shufflePos];
              logWithTime(
                `➖ removeFromQueue: música atual removida, novo queueIndex=${queueIndex} via shuffleQueue[${shufflePos}]`,
              );
            } else {
              shufflePos = 0;
              logWithTime(
                `➖ removeFromQueue: shuffleQueue vazia após remoção, shufflePos=0`,
              );
            }
          } else {
            shufflePos = state.shufflePos;
          }
        }
        // Garante que o índice atual exista na shuffleQueue
        if (!shuffleQueue.includes(queueIndex) && shuffleQueue.length > 0) {
          shuffleQueue = [queueIndex, ...shuffleQueue];
          shufflePos = 0;
          logWithTime(
            `➖ removeFromQueue: queueIndex não estava na shuffleQueue, reinserido no início`,
          );
        }
      }

      const currentSong = queue[queueIndex] ?? queue[0];
      logWithTime(
        `➖ removeFromQueue final: novo queueIndex=${queueIndex}, nova currentSong=${currentSong?.title}, shufflePos=${shufflePos}`,
      );
      return { queue, queueIndex, currentSong, shuffleQueue, shufflePos };
    }),

  clearQueue: () => {
    logWithTime(`🗑️ clearQueue chamado`);
    set({
      queue: [],
      queueIndex: 0,
      currentSong: null,
      isPlaying: false,
      progress: 0,
      currentTime: 0,
      duration: 0,
      shuffle: false,
      shuffleQueue: [],
      shufflePos: 0,
    });
  },

  setVolume: (value) => {
    logWithTime(`🔊 setVolume: ${value}`);
    set({ volume: value });
  },
}));
