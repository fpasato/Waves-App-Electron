import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "path";
import { readdirSync, statSync } from "fs";
import { pathToFileURL } from "node:url";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { initDatabase, closeDatabase } from "./database.js";
import { registerDatabaseHandlers } from "./databaseHandlers.js";
import * as mm from "music-metadata"; // importação ES modules

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".flac", ".ogg", ".m4a"];

// Função assíncrona para ler duração de um arquivo
async function getAudioDuration(filePath) {
  try {
    const metadata = await mm.parseFile(filePath);
    return metadata.format.duration || 0; // duração em segundos
  } catch (err) {
    console.error(`Erro ao ler metadados de ${filePath}:`, err);
    return 0;
  }
}

async function scanFolder(folderPath) {
  const results = [];
  try {
    const entries = readdirSync(folderPath);
    for (const entry of entries) {
      const fullPath = join(folderPath, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...(await scanFolder(fullPath)));
      } else {
        const ext = entry.slice(entry.lastIndexOf(".")).toLowerCase();
        if (AUDIO_EXTENSIONS.includes(ext)) {
          const duration = await getAudioDuration(fullPath);
          // Opcional: tente extrair artista do metadata
          let artist = "Desconhecido";
          try {
            const metadata = await mm.parseFile(fullPath, { skipCovers: true });
            if (metadata.common.artist) artist = metadata.common.artist;
          } catch (e) {
            /* ignora */
          }

          results.push({
            id: fullPath, // ainda é a string do caminho; idealmente o banco gerará um id numérico
            path: fullPath,
            title: entry.replace(/\.[^/.]+$/, ""),
            artist: artist,
            duration: duration,
            src: pathToFileURL(fullPath).href,
            cover: null,
          });
        }
      }
    }
  } catch (e) {
    console.error("Erro ao escanear:", e);
  }
  return results;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 860,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      webSecurity: false,
    },
  });

  mainWindow.on("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.electron");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.on("ping", () => console.log("pong"));

  ipcMain.handle("dialog:selectFolder", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (canceled) return null;
    return filePaths[0];
  });

  ipcMain.handle("music:scanFolder", async (_, folderPath) => {
    return scanFolder(folderPath);
  });

  initDatabase();
  registerDatabaseHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  closeDatabase();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
