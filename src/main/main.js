// src/main/main.js
import { app, BrowserWindow, Menu } from "electron";
import { electronApp } from "@electron-toolkit/utils";

import {
  ensureYtDlp,
  ytDlpPath,
  ytDlp,
  ffmpegPath,
  baseFlags,
  baseFlagsPlaylist,
  USER_AGENT,
  YOUTUBE_PARTITION,
} from "./utils.js";
import { setupAdBlocker } from "./adblocker.js";
import { createWindow } from "./window.js";
import { registerMiscHandlers } from "./handlers/misc.js";
import { registerDownloadHandlers } from "./handlers/downloads.js";
import { initDatabase, closeDatabase } from "./database/database.js";
import { registerDbHandlers } from "./handlers/dbHandlers.js";
import { registerYoutubeHandlers } from "./handlers/youtubeHandlers.js";
import { registerAuthHandlers } from "./handlers/authHandlers.js";

const searchYoutube = async () => {
  console.warn("searchYoutube não implementada");
  return [];
};

// ─── Extensões suportadas ──────────────────────────────────
const MEDIA_EXTENSIONS = /\.(mp4|mkv|avi|mov|webm|mp3|flac|wav|ogg|m4a|aac)$/i;

// Extrai o caminho de mídia dos argumentos do processo
function getMediaFileFromArgs(argv) {
  return argv.find((arg) => MEDIA_EXTENSIONS.test(arg)) || null;
}

// Envia o arquivo para o renderer (aguarda a janela estar pronta)
function sendFileToRenderer(win, filePath) {
  if (!filePath || !win) return;

  if (win.webContents.isLoading()) {
    win.webContents.once("did-finish-load", () => {
      win.webContents.send("open-file", filePath);
    });
  } else {
    win.webContents.send("open-file", filePath);
  }
}

// ─── Single instance lock ──────────────────────────────────
// Garante que só uma instância rode; se o usuário abrir um arquivo
// com o app já aberto, foca a janela existente e envia o arquivo.
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_, argv) => {
    const filePath = getMediaFileFromArgs(argv);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      if (filePath) sendFileToRenderer(mainWindow, filePath);
    }
  });
}

// ─── Flags de autenticação ─────────────────────────────────
app.commandLine.appendSwitch("auth-server-whitelist", "*.google.com");
app.commandLine.appendSwitch("auth-negotiate-delegate-whitelist", "*.google.com");

let mainWindow = null;

async function bootstrap() {
  electronApp.setAppUserModelId("com.electron");
  // Menu.setApplicationMenu(null);
  await ensureYtDlp();
  await setupAdBlocker(YOUTUBE_PARTITION);

  const db = initDatabase();
  registerDbHandlers(db);
  registerYoutubeHandlers({ ytDlp, ffmpegPath, baseFlags, searchYoutube });
  registerAuthHandlers();
  registerMiscHandlers();

  mainWindow = await createWindow(USER_AGENT);

  registerDownloadHandlers({
    mainWindow,
    ytDlpPath,
    ffmpegPath,
    baseFlags,
    baseFlagsPlaylist,
  });

  // Arquivo aberto via duplo clique ao iniciar o app (Windows/Linux)
  const fileFromArgs = getMediaFileFromArgs(process.argv);
  if (fileFromArgs) sendFileToRenderer(mainWindow, fileFromArgs);

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = await createWindow(USER_AGENT);
    }
  });

  // macOS: arquivo aberto enquanto o app já está rodando
  app.on("open-file", (event, filePath) => {
    event.preventDefault();
    sendFileToRenderer(mainWindow, filePath);
  });
}

app.whenReady().then(bootstrap);

app.on("before-quit", closeDatabase);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});