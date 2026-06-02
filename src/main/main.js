// src/main/main.js
import { app, BrowserWindow } from "electron";
import { electronApp } from "@electron-toolkit/utils";

import {
  ensureYtDlp,
  ytDlpPath,
  ytDlp,
  ffmpegPath,
  baseFlags,
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
import { registerGeminiHandler } from "./handlers/geminiHandler.js";

// Se você tem uma função searchYoutube real, importe-a:
// import { searchYoutube } from './services/youtubeSearch.js';
// Caso contrário, crie uma função temporária ou ajuste o registerYoutubeHandlers.
const searchYoutube = async (query, forceRefresh, rawQuery) => {
  // Implementação real (placeholder)
  console.warn("searchYoutube não implementada");
  return [];
};

// ─── Flags de autenticação ─────────────────────────────────
app.commandLine.appendSwitch("auth-server-whitelist", "*.google.com");
app.commandLine.appendSwitch(
  "auth-negotiate-delegate-whitelist",
  "*.google.com",
);

let mainWindow = null;

async function bootstrap() {
  electronApp.setAppUserModelId("com.electron");

  await ensureYtDlp();
  await setupAdBlocker(USER_AGENT, YOUTUBE_PARTITION);

  const db = initDatabase();
  registerDbHandlers(db);
  registerYoutubeHandlers({ ytDlp, ffmpegPath, baseFlags, searchYoutube });
  registerAuthHandlers();
  registerMiscHandlers();
  registerGeminiHandler();

  // ✅ Handlers de download registrados UMA vez, fora do createWindow
  mainWindow = await createWindow(USER_AGENT);

  registerDownloadHandlers({
    mainWindow,
    ytDlpPath,
    ffmpegPath,
    baseFlags,
  });

  // ✅ No activate, só recria a janela — NÃO registra handlers de novo
  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = await createWindow(USER_AGENT);
      // registerDownloadHandlers NÃO vai aqui
    }
  });
}



app.whenReady().then(bootstrap);

app.on("before-quit", closeDatabase);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
