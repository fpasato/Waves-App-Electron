// src/main/main.js
import { app, BrowserWindow } from "electron";
import { electronApp, optimizer } from "@electron-toolkit/utils";

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

  // 1. Garantir que o yt-dlp está baixado
  await ensureYtDlp();

  // 2. Iniciar adblocker
  await setupAdBlocker(USER_AGENT, YOUTUBE_PARTITION);

  // 3. Inicializar banco e registrar handlers que não dependem da janela
  const db = initDatabase();
  registerDbHandlers(db);
  registerYoutubeHandlers({ ytDlp, ffmpegPath, baseFlags, searchYoutube });
  registerAuthHandlers();
  registerMiscHandlers(); // ping, dialog, scan, radio

  // 4. Criar janela principal
  mainWindow = await createWindow(USER_AGENT);

  // 5. Registrar handlers que dependem da janela (download com progresso)
  registerDownloadHandlers({
    mainWindow,
    ytDlpPath,
    ffmpegPath,
    baseFlags,
  });
  registerGeminiHandler();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = await createWindow(USER_AGENT);
    }
  });
}

app.whenReady().then(bootstrap);

app.on("before-quit", closeDatabase);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
