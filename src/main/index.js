import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "path";
import { readdirSync, statSync } from "fs";
import { pathToFileURL } from "node:url";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { initDatabase, closeDatabase } from "./database.js";
import { registerDatabaseHandlers } from "./databaseHandlers.js";
import * as mm from "music-metadata";

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

function parseArtistTitleFromFilename(filename) {
  let nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

  // 1. Remove sufixo de canal: "- NomeCanal (youtube/vevo/music)" no final
  nameWithoutExt = nameWithoutExt
    .replace(/\s*-\s*[^-(]+\([^)]*(?:youtube|vevo|music)\)[^-]*$/i, "")
    .trim();

  // 2. Remove "(youtube)" solto no final
  nameWithoutExt = nameWithoutExt
    .replace(/\s*\([^)]*youtube[^)]*\)\s*$/i, "")
    .trim();

  const parts = nameWithoutExt
    .split(" - ")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 1) {
    return { artist: "Desconhecido", title: parts[0] };
  }

  const p0 = parts[0];
  const p1 = parts[1];

  // Palavras-chave que indicam título (não artista)
  const TITLE_KEYWORDS = [
    /\blyrics\b/i,
    /\bofficial\b/i,
    /\bvideo\b/i,
    /\bclip\b/i,
    /\bremix\b/i,
    /\bcover\b/i,
    /\blive\b/i,
    /\bacoustic\b/i,
    /\baudio\b/i,
    /\bfeat\.?\b/i,
    /\bft\.?\b/i,
    /\bslowed\b/i,
    /\breverb\b/i,
    /\bsped\s+up\b/i,
    /[🎵♪♫]/,
  ];

  function titleScore(str) {
    let score = 0;
    for (const r of TITLE_KEYWORDS) if (r.test(str)) score += 2;
    // Parênteses com conteúdo = forte indicador de título
    const parenMatch = str.match(/\(([^)]+)\)/g);
    if (parenMatch) score += parenMatch.length * 2;
    return score;
  }

  // Heurística: quanto a string parece um nome de artista
  function artistScore(str) {
    let score = 0;
    // Sem parênteses é bom sinal
    if (!/\(/.test(str)) score += 2;
    // String curta (≤ 30 chars) favorece artista
    if (str.length <= 30) score += 1;
    // Palavras com inicial maiúscula (nome próprio)
    const words = str.trim().split(/\s+/);
    const capitalizedWords = words.filter(
      (w) =>
        w.length > 0 && w[0] === w[0].toUpperCase() && /[A-Za-zÀ-ú]/.test(w[0]),
    );
    if (capitalizedWords.length === words.length && words.length >= 1)
      score += 2;
    // Penaliza se contém palavras-chave de título
    score -= titleScore(str);
    return score;
  }

  const artist0 = artistScore(p0);
  const artist1 = artistScore(p1);

  // Quem tem maior artistScore é o artista
  if (artist1 > artist0) {
    return { artist: p1, title: p0 };
  }

  return { artist: p0, title: p1 };
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
          try {
            const metadata = await mm.parseFile(fullPath, {
              skipCovers: true,
              native: true,
            });
            const duration = metadata.format.duration || 0;
            const common = metadata.common;

            let artista = "Desconhecido";
            let titulo = entry.replace(/\.[^/.]+$/, "");

            if (common.artist) {
              artista = Array.isArray(common.artist)
                ? common.artist[0]
                : common.artist;
            }
            if (common.title) {
              titulo = common.title;
            }

            // Fallback: extrai do nome do arquivo
            if (artista === "Desconhecido" || !common.title) {
              const { artist: parsedArtist, title: parsedTitle } =
                parseArtistTitleFromFilename(entry);
              if (parsedArtist !== "Desconhecido") artista = parsedArtist;
              if (parsedTitle) titulo = parsedTitle;
            }

            results.push({
              id: fullPath,
              path: fullPath,
              title: titulo,
              artist: artista,
              duration: duration,
              src: pathToFileURL(fullPath).href,
              cover: null,
            });

            console.log(`✅ Extraído: "${artista}" - "${titulo}" de ${entry}`);
          } catch (err) {
            console.error(`Erro ao processar ${fullPath}:`, err);
          }
        } // fim do if (AUDIO_EXTENSIONS)
      } // fim do else (não é diretório)
    } // fim do for
  } catch (e) {
    console.error("Erro ao escanear pasta:", e);
  }
  return results; // ← agora está fora do for e do try
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
