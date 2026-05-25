import { app, shell, BrowserWindow, ipcMain, dialog, session } from "electron";
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

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
async function ensureYtDlp() {
  const dest = path.join(
    app.getPath("userData"),
    process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp",
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
app.commandLine.appendSwitch("host-resolver-rules", "");
app.commandLine.appendSwitch("ignore-certificate-errors");

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
      webviewTag: false,
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

  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ["*://*.googlevideo.com/*", "*://*.youtube.com/*"] },
    (details, callback) => {
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          Referer: "https://www.youtube.com/",
          Origin: "https://www.youtube.com",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        },
      });
    },
  );

  mainWindow.webContents.session.webRequest.onBeforeRequest(
    {
      urls: [
        "*://*.doubleclick.net/*",
        "*://*.googlesyndication.com/*",
        "*://*.googleadservices.com/*",
        "*://*.google-analytics.com/*",
        "*://*.googletagmanager.com/*",
      ],
    },
    (details, callback) => {
      callback({ cancel: true }); // bloqueia a requisição
    },
  );
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ["<all_urls>"] },
    (details, callback) => {
      const headers = { ...details.responseHeaders };

      const origin =
        details.requestHeaders?.Origin ||
        details.requestHeaders?.origin ||
        "https://www.youtube.com";

      delete headers["access-control-allow-origin"];
      delete headers["Access-Control-Allow-Origin"];
      delete headers["cross-origin-opener-policy"];
      delete headers["Cross-Origin-Opener-Policy"]; // bloqueia postMessage
      delete headers["cross-origin-embedder-policy"];
      delete headers["Cross-Origin-Embedder-Policy"];

      headers["Access-Control-Allow-Origin"] = [origin];
      headers["Access-Control-Allow-Credentials"] = ["true"];
      headers["Access-Control-Allow-Methods"] = ["GET, POST, OPTIONS"];
      headers["Access-Control-Allow-Headers"] = ["*"];
      headers["Content-Security-Policy"] = [
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; media-src * data: blob: file:;",
      ];

      callback({ responseHeaders: headers });
    },
  );
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
