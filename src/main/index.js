import { app, shell, BrowserWindow, ipcMain, dialog, session } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { createRequire } from "module";
import path from "path";
import fs from "fs";

import { ElectronBlocker } from "@ghostery/adblocker-electron";
import fetch from "cross-fetch";

import { initDatabase, closeDatabase } from "./database/database.js";
import { registerDatabaseHandlers } from "./database/databaseApi.js";
import { scanFolder } from "./services/musicService.js";

// ─── Constantes ────────────────────────────────────────────────────────────────

const require = createRequire(import.meta.url);
const YTDlpWrapModule = require("yt-dlp-wrap");
const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule;

app.commandLine.appendSwitch("auth-server-whitelist", "*.google.com");
app.commandLine.appendSwitch(
  "auth-negotiate-delegate-whitelist",
  "*.google.com",
);

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const YOUTUBE_PARTITION = "persist:youtube";
let adblockerInitialized = false;   
// ─── yt-dlp ────────────────────────────────────────────────────────────────────

async function ensureYtDlp() {
  const ytDlpPath = path.join(
    app.getPath("userData"),
    process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp",
  );

  if (fs.existsSync(ytDlpPath)) {
    console.log("✅ yt-dlp já existe:", ytDlpPath);
    return ytDlpPath;
  }

  try {
    await YTDlpWrap.downloadFromGithub(ytDlpPath);
    console.log("✅ yt-dlp baixado:", ytDlpPath);
  } catch (err) {
    console.warn("❌ Erro ao baixar yt-dlp:", err);
  }

  return ytDlpPath;
}

// ─── Adblocker ─────────────────────────────────────────────────────────────────

async function setupAdBlocker() {
  if (adblockerInitialized) return;
  adblockerInitialized = true;

  const cachePath = path.join(app.getPath("userData"), "adblocker-cache.bin");

  const filterLists = [
    "https://easylist.to/easylist/easylist.txt",
    "https://easylist.to/easylist/easyprivacy.txt",
    "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt",
    "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters-2023.txt",
    "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt",
    "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt",
    "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt",
  ];

  const blocker = await ElectronBlocker.fromLists(fetch, filterLists, {
    path: cachePath,
    read: fs.promises.readFile,
    write: fs.promises.writeFile,
    enableCompression: true,
  });

  // User-Agent na sessão padrão (não afeta o YouTube, mas mantemos)
  session.defaultSession.setUserAgent(USER_AGENT);

  const youtubeSession = session.fromPartition(YOUTUBE_PARTITION);
  youtubeSession.setUserAgent(USER_AGENT);

  // ── Listener único: whitelist + bloqueio manual ──────────────────────
  youtubeSession.webRequest.onBeforeRequest((details, callback) => {
    const url = new URL(details.url);
    const hostname = url.hostname;

    // Domínios que NUNCA devem ser bloqueados (essenciais para o player)
    const whitelistedDomains = [
      'youtube.com', 'youtube-nocookie.com',
      'google.com', 'googleapis.com', 'gstatic.com',
      'googlevideo.com', 'ytimg.com', 'ggpht.com',
      'googleusercontent.com', 'youtu.be',
    ];

    if (whitelistedDomains.some(domain => hostname.endsWith(domain))) {
      return callback({ cancel: false });
    }

    // Para outros domínios, aplica o bloqueador de rede (anúncios/tracking)
    try {
      const { match } = blocker.match({
        url: details.url,
        type: details.resourceType,
        isFirstParty: false,
      });
      callback({ cancel: match });
    } catch {
      callback({ cancel: false });
    }
  });

  // Mantemos os cabeçalhos para login (não interfere no carregamento)
  youtubeSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = {
      ...details.requestHeaders,
      "User-Agent": USER_AGENT,
      "Sec-Ch-Ua":
        '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
    };
    callback({ requestHeaders: headers });
  });

  console.log("✅ Adblocker ativo (bloqueio manual, whitelist ampla)");
}

// ─── Janela principal ───────────────────────────────────────────────────────────

function setupExternalLinks(window) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes("youtube.com")) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
}

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 900,
    minHeight: 670,
    autoHideMenuBar: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      webviewTag: true,
      autoplayPolicy: "no-user-gesture-required",
      webSecurity: false,
    },
  });

  mainWindow.webContents.setUserAgent(USER_AGENT);
  setupExternalLinks(mainWindow);

  mainWindow.once("ready-to-show", () => mainWindow.show());

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    await mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
}

// ─── IPC ───────────────────────────────────────────────────────────────────────

function registerIpcHandlers() {
  ipcMain.on("ping", () => console.log("pong"));

  ipcMain.handle("dialog:selectFolder", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    return canceled ? null : filePaths[0];
  });

  ipcMain.handle("music:scanFolder", async (_, folderPath) => {
    return scanFolder(folderPath);
  });

}

// ─── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  electronApp.setAppUserModelId("com.electron");

  await ensureYtDlp();
  await setupAdBlocker();

  initDatabase();
  registerDatabaseHandlers();
  registerIpcHandlers();

  await createWindow();

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
}

app.whenReady().then(bootstrap);

app.on("before-quit", closeDatabase);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});