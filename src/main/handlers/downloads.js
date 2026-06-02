// src/main/handlers/downloads.js
import { ipcMain, app, shell } from "electron";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

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

export function registerDownloadHandlers({
  mainWindow,
  ytDlpPath,
  ffmpegPath,
  baseFlags,
}) {
  const DOWNLOAD_DIRS = {
    video: path.join(app.getPath("documents"), "Vibe", "video"),
    audio: path.join(app.getPath("documents"), "Vibe", "audios"),
    radio: path.join(app.getPath("documents"), "Vibe", "gravações de radio"),
  };

  // ── Helpers de comunicação ──────────────────────────────
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

  function runWithProgress({ args, id, title, type }) {
    return new Promise((resolve, reject) => {
      const proc = spawn(ytDlpPath, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let buffer = "";

      const handleChunk = (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop();
        for (const line of lines) {
          const p = parseProgress(line);
          if (p) sendProgress({ id, title, type, ...p });
        }
      };

      proc.stdout.on("data", handleChunk);
      proc.stderr.on("data", handleChunk);

      proc.on("close", (code) => {
        if (code === 0 || code === null) resolve();
        else reject(new Error(`yt-dlp saiu com código ${code}`));
      });

      proc.on("error", reject);
    });
  }

  // ── deleteFile ──────────────────────────────────────
  ipcMain.handle("downloads:deleteFile", async (_, filePath) => {
    try {
      // Segurança: só permite deletar arquivos dentro das pastas conhecidas
      const allowedDirs = Object.values(DOWNLOAD_DIRS);
      const normalized = path.normalize(filePath);
      const isAllowed = allowedDirs.some((dir) =>
        normalized.startsWith(path.normalize(dir)),
      );
      if (!isAllowed) throw new Error("Caminho não permitido");

      await fs.promises.unlink(filePath);
      return { success: true };
    } catch (err) {
      console.error("Erro ao deletar:", err);
      return { success: false, error: err.message };
    }
  });

  // ── openFile ────────────────────────────────────────
  ipcMain.handle("downloads:openFile", async (_, filePath) => {
    try {
      await shell.openPath(filePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── revealFile ──────────────────────────────────────
  ipcMain.handle("downloads:revealFile", async (_, filePath) => {
    shell.showItemInFolder(filePath);
    return { success: true };
  });

  // ── listFiles ───────────────────────────────────────────
  ipcMain.handle("downloads:listFiles", async () => {
    const results = [];

    for (const [type, dir] of Object.entries(DOWNLOAD_DIRS)) {
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
              type, // 'video' | 'audio' | 'radio'
            });
          }
        } catch {
          // arquivo inacessível, ignora
        }
      }
    }

    return results;
  });

  // ── download:video ──────────────────────────────────────
  ipcMain.handle("download:video", async (_, { videoId, title, formatId }) => {
    const id = `video-${videoId}-${Date.now()}`;
    try {
      const savePath = DOWNLOAD_DIRS.video;
      fs.mkdirSync(savePath, { recursive: true });
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
          ffmpegPath,
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

  // ── download:audio ──────────────────────────────────────
  ipcMain.handle("download:audio", async (_, { videoId, title, formatId }) => {
    const id = `audio-${videoId}-${Date.now()}`;
    try {
      const savePath = DOWNLOAD_DIRS.audio;
      fs.mkdirSync(savePath, { recursive: true });
      const safeTitle = (title ?? "audio").replace(/[<>:"/\\|?*]/g, "").trim();

      // Extensão vai ser a do formato escolhido (m4a, webm, opus...)
      const filePath = path.join(savePath, `${safeTitle}.%(ext)s`);

      sendProgress({ id, title, type: "audio", percent: 0 });

      await runWithProgress({
        id,
        title,
        type: "audio",
        args: [
          `https://www.youtube.com/watch?v=${videoId}`,
          "-f",
          formatId, // formato exato que o usuário escolheu
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
