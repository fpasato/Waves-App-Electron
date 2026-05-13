import { create } from "zustand";
import { refreshLibraryFromDisk, reloadLibraryFromDb } from "../lib/syncLibrary";

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

  fadeEnabled: false,
  fadeDuration: 3,

  setFadeEnabled: (fadeEnabled) => set({ fadeEnabled }),

  setFadeDuration: (value) =>
    set({
      fadeDuration: Math.min(
        15,
        Math.max(1, Math.floor(Number(value)) || 3),
      ),
    }),

  loadPlaybackSettings: async () => {
    if (typeof window === "undefined" || !window.api?.settings) return;
    try {
      const en = await window.api.settings.get("fadeEnabled");
      const du = await window.api.settings.get("fadeDuration");
      const parsed = parseInt(du ?? "3", 10);
      set({
        fadeEnabled: en === "true",
        fadeDuration: Math.min(15, Math.max(1, Number.isFinite(parsed) ? parsed : 3)),
      });
    } catch {
      /* defaults */
    }
  },

  setLibrary: (library) => set({ library }),

  /** Re-escaneia pastas na DB e atualiza `library`. */
  syncLibraryWithDatabase: async () => {
    const songs = await refreshLibraryFromDisk();
    set({ library: songs });
    return songs;
  },

  /** Só `SELECT * FROM songs` (rápido). */
  reloadLibraryFromDatabase: async () => {
    const songs = await reloadLibraryFromDb();
    set({ library: songs });
    return songs;
  },

  /** Toca uma música e opcionalmente define a fila (ex.: `library` vinda da DB). */
  playSong: (song, queueArg) => {
    const finalQueue = queueArg?.length ? queueArg : [song];
    const index = finalQueue.findIndex((s) => s.id === song.id);
    const queueIndex = index >= 0 ? index : 0;
    const current = finalQueue[queueIndex];
    set({
      queue: finalQueue,
      queueIndex,
      currentSong: current,
      isPlaying: true,
      shuffleQueue: [],
      shuffle: false,
    });
  },

  setSong: (song) => {
    const { queue, playSong } = get();
    const index = queue.findIndex((s) => s.id === song.id);
    if (index < 0) {
      playSong(song, [...queue, song]);
      return;
    }
    set({
      currentSong: song,
      isPlaying: true,
      queueIndex: index,
    });
  },

  /** Próxima faixa na fila (sem alterar estado) — usado no crossfade. */
  peekNextSong: () => {
    const { queue, queueIndex, shuffle, repeat, shuffleQueue } = get();
    if (queue.length === 0) return null;

    if (shuffle) {
      const currentShufflePos = shuffleQueue.indexOf(queueIndex);
      const nextShufflePos = currentShufflePos + 1;

      if (nextShufflePos >= shuffleQueue.length) {
        if (repeat) {
          const allIndices = queue.map((_, i) => i);
          const reshuffled = allIndices.sort(() => Math.random() - 0.5);
          return queue[reshuffled[0]] ?? null;
        }
        return null;
      }

      const nextIndex = shuffleQueue[nextShufflePos];
      return queue[nextIndex] ?? null;
    }

    const nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeat) return queue[0] ?? null;
      return null;
    }

    return queue[nextIndex] ?? null;
  },

  nextSong: () => {
    const { queue, queueIndex, shuffle, repeat, shuffleQueue } = get();

    if (queue.length === 0) return set({ currentSong: null, isPlaying: false });

    if (shuffle) {
      const currentShufflePos = shuffleQueue.indexOf(queueIndex);
      const nextShufflePos = currentShufflePos + 1;

      if (nextShufflePos >= shuffleQueue.length) {
        if (repeat) {
          const allIndices = queue.map((_, i) => i);
          const reshuffled = allIndices.sort(() => Math.random() - 0.5);
          return set({
            queueIndex: reshuffled[0],
            currentSong: queue[reshuffled[0]],
            shuffleQueue: reshuffled,
            isPlaying: true,
          });
        }
        return set({
          currentSong: null,
          isPlaying: false,
          progress: 0,
          currentTime: 0,
        });
      }

      const nextIndex = shuffleQueue[nextShufflePos];
      return set({
        queueIndex: nextIndex,
        currentSong: queue[nextIndex],
        isPlaying: true,
      });
    }

    const nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeat)
        return set({ queueIndex: 0, currentSong: queue[0], isPlaying: true });
      return set({
        currentSong: null,
        isPlaying: false,
        progress: 0,
        currentTime: 0,
      });
    }

    set({
      queueIndex: nextIndex,
      currentSong: queue[nextIndex],
      isPlaying: true,
    });
  },

  previousSong: () => {
    const { queue, queueIndex, shuffle, shuffleQueue } = get();
    if (queue.length === 0) return;

    if (shuffle) {
      const currentShufflePos = shuffleQueue.indexOf(queueIndex);
      const prevShufflePos = currentShufflePos - 1;
      if (prevShufflePos < 0) return;
      const prevIndex = shuffleQueue[prevShufflePos];
      return set({
        queueIndex: prevIndex,
        currentSong: queue[prevIndex],
        isPlaying: true,
      });
    }

    const prevIndex = queueIndex - 1;
    if (prevIndex < 0) return;
    set({
      queueIndex: prevIndex,
      currentSong: queue[prevIndex],
      isPlaying: true,
    });
  },

  stop: () =>
    set({
      currentSong: null,
      isPlaying: false,
      progress: 0,
      currentTime: 0,
      duration: 0,
    }),

  togglePlay: () => {
    const { currentSong, queue, queueIndex, isPlaying } = get();
    if (!currentSong && queue.length > 0)
      return set({ currentSong: queue[queueIndex], isPlaying: true });
    set({ isPlaying: !isPlaying });
  },

  setPlaying: (value) => set({ isPlaying: value }),

  toggleShuffle: () => {
    const { shuffle, queue, queueIndex } = get();
    if (!shuffle) {
      const indices = queue.map((_, i) => i).filter((i) => i !== queueIndex);
      const shuffled = indices.sort(() => Math.random() - 0.5);
      return set({ shuffle: true, shuffleQueue: [queueIndex, ...shuffled] });
    }
    set({ shuffle: false, shuffleQueue: [] });
  },

  toggleRepeat: () => set((state) => ({ repeat: !state.repeat })),

  setProgress: (value) => set({ progress: value }),
  setCurrentTime: (value) => set({ currentTime: value }),
  setDuration: (value) => set({ duration: value }),

  setQueue: (queue) =>
    set({
      queue: queue ?? [],
      queueIndex: 0,
      currentSong: queue?.[0] ?? null,
    }),

  addToQueue: (song) => {
    const { queue, shuffle, shuffleQueue, queueIndex } = get();
    const newQueue = [...queue, song];
    const newIndex = newQueue.length - 1;

    if (shuffle) {
      const currentPos = shuffleQueue.indexOf(queueIndex);
      const insertPos =
        Math.floor(Math.random() * (shuffleQueue.length - currentPos)) +
        currentPos +
        1;
      const newShuffleQueue = [...shuffleQueue];
      newShuffleQueue.splice(insertPos, 0, newIndex);
      return set({ queue: newQueue, shuffleQueue: newShuffleQueue });
    }

    set({ queue: newQueue });
  },

  removeFromQueue: (index) =>
    set((state) => {
      if (index < 0 || index >= state.queue.length) return state;
      const queue = state.queue.filter((_, i) => i !== index);
      let queueIndex = state.queueIndex;
      if (index < state.queueIndex) queueIndex -= 1;
      else if (index === state.queueIndex)
        queueIndex = Math.min(queueIndex, queue.length - 1);
      queueIndex = Math.max(0, queueIndex);

      if (queue.length === 0) {
        return {
          queue: [],
          queueIndex: 0,
          currentSong: null,
          isPlaying: false,
          progress: 0,
          currentTime: 0,
          duration: 0,
          shuffleQueue: [],
          shuffle: false,
        };
      }

      let shuffleQueue = state.shuffleQueue;
      if (state.shuffle && shuffleQueue.length) {
        shuffleQueue = shuffleQueue
          .filter((i) => i !== index)
          .map((i) => (i > index ? i - 1 : i));
      }

      const currentSong = queue[queueIndex] ?? queue[0];
      return { queue, queueIndex, currentSong, shuffleQueue };
    }),

  clearQueue: () =>
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
    }),
    
  setVolume: (value) => set({ volume: value }),
}));
