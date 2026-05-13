import { create } from "zustand";
import { useRef } from "react";

export const usePlayerStore = create((set, get) => ({
  // =========================
  // STATE
  // =========================
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

  // =========================
  // SONG CONTROL
  // =========================
  setSong: (song) => {
    const { queue } = get();
    const index = queue.findIndex((s) => s.id === song.id);
    set({
      currentSong: song,
      isPlaying: true,
      queueIndex: index >= 0 ? index : 0,
    });
  },

  nextSong: () => {
    const { queue, queueIndex, shuffle, repeat, shuffleQueue } = get();

    if (queue.length === 0) return set({ currentSong: null, isPlaying: false });

    if (shuffle) {
      const currentShufflePos = shuffleQueue.indexOf(queueIndex);
      const nextShufflePos = currentShufflePos + 1;

      if (nextShufflePos >= shuffleQueue.length) {
        if (repeat) {
          // reembaralha e começa do índice 0 da nova ordem
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

  // =========================
  // PLAYBACK
  // =========================
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

  // =========================
  // TIME / PROGRESS
  // =========================
  setProgress: (value) => set({ progress: value }),
  setCurrentTime: (value) => set({ currentTime: value }),
  setDuration: (value) => set({ duration: value }),

  // =========================
  // LIBRARY
  // =========================
  setLibrary: (library) => set({ library }),

  // =========================
  // QUEUE
  // =========================
  setQueue: (queue) => set({ queue }),

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
    set((state) => ({ queue: state.queue.filter((_, i) => i !== index) })),
  clearQueue: () => set({ queue: [], queueIndex: 0 }),

  // =========================
  // VOLUME
  // =========================
  setVolume: (value) => set({ volume: value }),
}));
