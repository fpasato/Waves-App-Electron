import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import { promises as fs } from "fs";

const api = {
  settings: {
    get: (key) => ipcRenderer.invoke("settings:get", key),
    set: (key, value) => ipcRenderer.invoke("settings:set", key, value),
  },

  db: {
    directories: {
      add: (dirPath) => ipcRenderer.invoke("db:directories:add", dirPath),
      remove: (id) => ipcRenderer.invoke("db:directories:remove", id),
      list: () => ipcRenderer.invoke("db:directories:list"),
    },
    songs: {
      upsertMany: (songs) => ipcRenderer.invoke("db:songs:upsertMany", songs),
      getAll: () => ipcRenderer.invoke("db:songs:getAll"),
      getByDirectory: (dirId) =>
        ipcRenderer.invoke("db:songs:getByDirectory", dirId),
      recordPlay: (songId) => ipcRenderer.invoke("db:songs:recordPlay", songId),
    },
    favorites: {
      add: (songId) => ipcRenderer.invoke("db:favorites:add", songId),
      remove: (songId) => ipcRenderer.invoke("db:favorites:remove", songId),
      isFavorite: (songId) =>
        ipcRenderer.invoke("db:favorites:isFavorite", songId),
      list: () => ipcRenderer.invoke("db:favorites:list"),
    },
    recents: {
      add: (songId) => ipcRenderer.invoke("db:recents:add", songId),
      list: (limit) => ipcRenderer.invoke("db:recents:list", limit),
      clear: () => ipcRenderer.invoke("db:recents:clear"),
    },
    playlists: {
      create: (name, cover) =>
        ipcRenderer.invoke("db:playlists:create", name, cover),
      rename: (id, name) => ipcRenderer.invoke("db:playlists:rename", id, name),
      remove: (id) => ipcRenderer.invoke("db:playlists:remove", id),
      list: () => ipcRenderer.invoke("db:playlists:list"),
      getSongs: (playlistId) =>
        ipcRenderer.invoke("db:playlists:getSongs", playlistId),
      addSong: (playlistId, songId) =>
        ipcRenderer.invoke("db:playlists:addSong", playlistId, songId),
      removeSong: (playlistId, songId) =>
        ipcRenderer.invoke("db:playlists:removeSong", playlistId, songId),
      reorder: (playlistId, songIds) =>
        ipcRenderer.invoke("db:playlists:reorder", playlistId, songIds),
    },
  },

  music: {
    selectFolder: () => ipcRenderer.invoke("dialog:selectFolder"),
    scanFolder: (folderPath) =>
      ipcRenderer.invoke("music:scanFolder", folderPath),
  },

  youtube: {
    search: (query, forceRefresh, rawQuery) =>
      ipcRenderer.invoke("youtube:search", query, forceRefresh, rawQuery),
    getVideoFormats: (videoId) =>
      ipcRenderer.invoke("youtube:getVideoFormats", videoId),
    downloadVideo: (payload) => ipcRenderer.invoke("download:video", payload),
    downloadAudio: (payload) => ipcRenderer.invoke("download:audio", payload),
  },

  radio: {
    saveRecording: (buffer, radioName) =>
      ipcRenderer.invoke("radio:saveRecording", { buffer, radioName }),
  },
};

const musicAPI = {
  openMusic: () => ipcRenderer.invoke("dialog:openMusic"),
  selectFolder: () => ipcRenderer.invoke("dialog:selectFolder"),
  scanFolder: (path) => ipcRenderer.invoke("music:scanFolder", path),
};

const electronAuthAPI = {
  openLoginWindow: (url) => ipcRenderer.invoke("auth:open-login", url),
  onAuthCompleted: (callback) => ipcRenderer.on("auth:completed", callback),
  removeAuthListener: (callback) =>
    ipcRenderer.removeListener("auth:completed", callback),
};

// electronAPI — usado pelo SearchScreen e outros via window.electronAPI
const electronAPIBridge = {
  ...electronAuthAPI,

  youtube: {
    search: (query, forceRefresh, rawQuery) =>
      ipcRenderer.invoke("youtube:search", query, forceRefresh, rawQuery),
    getVideoFormats: (videoId) =>
      ipcRenderer.invoke("youtube:getVideoFormats", videoId),
    downloadVideo: (data) => ipcRenderer.invoke("download:video", data),
    downloadAudio: (data) => ipcRenderer.invoke("download:audio", data),
  },

  googleLoginExternal: () => ipcRenderer.invoke("google:login-external"),
  googleImportCookies: () => ipcRenderer.invoke("google:import-cookies"),
  googleLogout: () => ipcRenderer.invoke("google:logout"),

  downloads: {
    listFiles: () => ipcRenderer.invoke("downloads:listFiles"),
    deleteFile: (filePath) =>
      ipcRenderer.invoke("downloads:deleteFile", filePath),
    openFile: (filePath) => ipcRenderer.invoke("downloads:openFile", filePath),
    revealFile: (filePath) =>
      ipcRenderer.invoke("downloads:revealFile", filePath),
    // Eventos de progresso
    onProgress: (callback) => ipcRenderer.on("download:progress", callback),
    onDone: (callback) => ipcRenderer.on("download:done", callback),
    onError: (callback) => ipcRenderer.on("download:error", callback),
    removeListeners: () => {
      ipcRenderer.removeAllListeners("download:progress");
      ipcRenderer.removeAllListeners("download:done");
      ipcRenderer.removeAllListeners("download:error");
    },
  },

  fs: {
    rename: (oldPath, newPath) =>
      ipcRenderer.invoke("fs:rename", oldPath, newPath),
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
    contextBridge.exposeInMainWorld("musicAPI", musicAPI);
    contextBridge.exposeInMainWorld("electronAPI", {
      ...electronAPIBridge,
      parseFilenameWithGemini: (fileName) =>
        ipcRenderer.invoke("gemini:parse-filename", fileName),
    });
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
  window.musicAPI = musicAPI;
  window.electronAPI = electronAPIBridge;
}
