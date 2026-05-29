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
      "youtube.com",
      "youtube-nocookie.com",
      "google.com",
      "googleapis.com",
      "gstatic.com",
      "googlevideo.com",
      "ytimg.com",
      "ggpht.com",
      "googleusercontent.com",
      "youtu.be",
    ];

    if (whitelistedDomains.some((domain) => hostname.endsWith(domain))) {
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
  ipcMain.handle("radio:saveRecording", async (_, { buffer, radioName }) => {
    const docsPath = app.getPath("documents");
    const saveDir = path.join(docsPath, "Vibe", "gravações de radio");

    // Cria a pasta se não existir
    fs.mkdirSync(saveDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = radioName.replace(/[/\\?%*:|"<>]/g, "_");
    const filePath = path.join(saveDir, `${safeName}_${timestamp}.webm`);

    fs.writeFileSync(filePath, Buffer.from(buffer));

    return filePath; // retorna o caminho pra confirmar
  });

  const DOWNLOAD_DIRS = {
    video: path.join(app.getPath("documents"), "Vibe", "video"),
    audio: path.join(app.getPath("documents"), "Vibe", "audios"),
  };

  /** Lista todos os arquivos das pastas video e audio */
  ipcMain.handle("downloads:listFiles", async () => {
    const results = [];

    for (const [, dir] of Object.entries(DOWNLOAD_DIRS)) {
      if (!fs.existsSync(dir)) continue;

      const entries = fs.readdirSync(dir);
      for (const name of entries) {
        const filePath = path.join(dir, name);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            results.push({
              name,
              path: filePath,
              size: stat.size,
              modifiedAt: stat.mtimeMs,
            });
          }
        } catch {
          // arquivo inacessível, ignora
        }
      }
    }

    return results;
  });

  const PROGRESS_RE =
    /\[download\]\s+([\d.]+)%(?:.*?at\s+([\d.]+\s*[\w/]+))?(?:.*?ETA\s+([\d:]+))?/;

  function parseProgress(line) {
    const m = line.match(PROGRESS_RE);
    if (!m) return null;
    const pct = parseFloat(m[1]);
    if (isNaN(pct) || pct > 100) return null;
    return {
      percent: Math.round(pct),
      speed: m[2]?.trim() ?? null,
      eta: m[3]?.trim() ?? null,
    };
  }

  function sendProgress(payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("download:progress", payload);
    }
  }
  function sendDone(id) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("download:done", { id });
    }
  }
  function sendError(id, error) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("download:error", { id, error });
    }
  }

  // Roda yt-dlp e emite progresso via stdout linha a linha
  function runWithProgress({ args, id, title, type }) {
    return new Promise((resolve, reject) => {
      // spawn direto para capturar stdout em tempo real
      const { spawn } = require("child_process");
      const proc = spawn(ytDlpPath, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let buffer = "";

      const handleChunk = (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop(); // último fragmento incompleto
        for (const line of lines) {
          console.log("[yt-dlp]", line); // debug — remova depois
          const p = parseProgress(line);
          if (p) sendProgress({ id, title, type, ...p });
        }
      };

      proc.stdout.on("data", handleChunk);
      proc.stderr.on("data", handleChunk); // yt-dlp às vezes escreve no stderr

      proc.on("close", (code) => {
        if (code === 0 || code === null) resolve();
        else reject(new Error(`yt-dlp saiu com código ${code}`));
      });

      proc.on("error", reject);
    });
  }

  // ── download:video ────────────────────────────────────────────────────────────
  ipcMain.handle("download:video", async (_, { videoId, title, formatId }) => {
    const id = `video-${videoId}-${Date.now()}`;
    try {
      const savePath = path.join(app.getPath("documents"), "Vibe", "video");
      if (!fs.existsSync(savePath)) fs.mkdirSync(savePath, { recursive: true });
      const safeTitle = (title ?? "video").replace(/[<>:"/\\|?*]/g, "").trim();
      const filePath = path.join(savePath, `${safeTitle}.mp4`);

      sendProgress({ id, title, type: "video", percent: 0 });

      await runWithProgress({
        id,
        title,
        type: "video",
        args: [
          `https://www.youtube.com/watch?v=${videoId}`,
          "-f",
          `${formatId}+bestaudio[ext=m4a]/${formatId}+bestaudio/best`,
          "--merge-output-format",
          "mp4",
          "--ffmpeg-location",
          ffmpegStatic,
          "--newline",
          "-o",
          filePath,
          ...baseFlags(),
        ],
      });

      sendDone(id);
      return { success: true, path: filePath };
    } catch (err) {
      console.error("❌ download:video erro:", err);
      sendError(id, err.message);
      return { success: false, error: err.message };
    }
  });

  // ── download:audio ────────────────────────────────────────────────────────────
  ipcMain.handle("download:audio", async (_, { videoId, title }) => {
    const id = `audio-${videoId}-${Date.now()}`;
    try {
      const savePath = path.join(app.getPath("documents"), "Vibe", "audios");
      if (!fs.existsSync(savePath)) fs.mkdirSync(savePath, { recursive: true });
      const safeTitle = (title ?? "audio").replace(/[<>:"/\\|?*]/g, "").trim();
      const filePath = path.join(savePath, `${safeTitle}.mp3`);

      sendProgress({ id, title, type: "audio", percent: 0 });

      await runWithProgress({
        id,
        title,
        type: "audio",
        args: [
          `https://www.youtube.com/watch?v=${videoId}`,
          "-x",
          "--audio-format",
          "mp3",
          "--audio-quality",
          "0",
          "--ffmpeg-location",
          ffmpegStatic,
          "--newline",
          "-o",
          filePath,
          ...baseFlags(),
        ],
      });

      sendDone(id);
      return { success: true, path: filePath };
    } catch (err) {
      console.error("❌ download:audio erro:", err);
      sendError(id, err.message);
      return { success: false, error: err.message };
    }
  });
}

// ─── Bootstrap ─────────────────────────────────────────────────────────────────

let mainWindow = null; // ← referência global

async function bootstrap() {
  electronApp.setAppUserModelId("com.electron");

  await ensureYtDlp();
  await setupAdBlocker();

  initDatabase();
  registerDatabaseHandlers();

  mainWindow = await createWindow(); // ← cria primeiro, guarda referência

  registerIpcHandlers(); // ← agora mainWindow já existe

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = await createWindow();
    }
  });
}

app.whenReady().then(bootstrap);

app.on("before-quit", closeDatabase);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
