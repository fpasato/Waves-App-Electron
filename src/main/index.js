import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { initDatabase, closeDatabase } from "./database/database.js";
import { registerDatabaseHandlers } from "./database/databaseApi.js";
import { scanFolder } from "./services/musicService.js";
import { createRequire } from "module";
import path from "path";
import fs from "fs";
const require = createRequire(import.meta.url);
const YTDlpWrapModule = require("yt-dlp-wrap");
const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule;


async function ensureYtDlp() {
  const dest = path.join(
    app.getPath("userData"),
    process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"
  );

  // Se já existe, não baixa de novo
  if (fs.existsSync(dest)) {
    console.log("✅ yt-dlp já existe em:", dest);
    return;
  }

  try {
    console.log("⬇️ Baixando yt-dlp...");
    await YTDlpWrap.downloadFromGithub(dest);
    console.log("✅ yt-dlp salvo em:", dest);
  } catch (e) {
    console.warn("yt-dlp erro:", e?.message ?? e);
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 900,
    minHeight: 670,
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

app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.electron");
  await ensureYtDlp();

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