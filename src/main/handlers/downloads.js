// src/main/handlers/downloads.js
import { ipcMain, app, shell } from "electron";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { randomUUID } from "crypto";

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
  baseFlagsPlaylist,
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

  function sendQueued(id, title, type) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("download:queued", { id, title, type });
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
              type,
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
    const id = `video-${videoId}-${randomUUID()}`;
    sendQueued(id, title, "video"); // ← entra na fila imediatamente

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
    const id = `audio-${videoId}-${randomUUID()}`;
    sendQueued(id, title, "audio"); // ← entra na fila imediatamente

    try {
      const savePath = DOWNLOAD_DIRS.audio;
      fs.mkdirSync(savePath, { recursive: true });
      const safeTitle = (title ?? "audio").replace(/[<>:"/\\|?*]/g, "").trim();

      const filePath = path.join(savePath, `${safeTitle}.%(ext)s`);

      sendProgress({ id, title, type: "audio", percent: 0 });

      await runWithProgress({
        id,
        title,
        type: "audio",
        args: [
          `https://www.youtube.com/watch?v=${videoId}`,
          "-f",
          formatId,
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

  // ── download:mix ────────────────────────────────────────
  ipcMain.handle(
    "download:mix",
    async (
      _,
      { playlistId, videoId, title, mode, format, videoIds, videoTitles },
    ) => {
      const parentId = `mix-${playlistId}-${randomUUID()}`;
      const isRegularPlaylist = !playlistId.startsWith("RD");

      try {
        const type = format === "audio" ? "audio" : "video";
        const savePath = DOWNLOAD_DIRS[type];
        fs.mkdirSync(savePath, { recursive: true });

        const isAudio = format === "audio";
        const formatArgs = isAudio
          ? [
              "-f",
              "bestaudio[ext=m4a]/bestaudio",
              "--ffmpeg-location",
              ffmpegPath,
            ]
          : [
              "-f",
              "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]",
              "--merge-output-format",
              "mp4",
              "--ffmpeg-location",
              ffmpegPath,
            ];

        const downloadOne = async (id, vid, childTitle) => {
          await runWithProgress({
            id,
            title: childTitle,
            type,
            args: [
              `https://www.youtube.com/watch?v=${vid}`,
              ...formatArgs,
              "--no-playlist",
              "--newline",
              "-o",
              path.join(savePath, "%(title)s.%(ext)s"),
              ...baseFlagsPlaylist(),
            ],
          });
          sendDone(id);
        };

        if (videoIds && videoIds.length > 0) {
          // Seleção manual — baixa um por um
          const items = videoIds.map((vid, i) => {
            const childId = `mix-${playlistId}-${vid}-${randomUUID()}`;
            const childTitle =
              videoTitles?.[i] ?? `${title} (${i + 1}/${videoIds.length})`;
            sendQueued(childId, childTitle, type);
            return { id: childId, vid, childTitle };
          });

          for (const item of items) {
            await downloadOne(item.id, item.vid, item.childTitle);
          }
        } else {
          // Playlist/mix inteira
          const url =
            mode === "single"
              ? `https://www.youtube.com/watch?v=${videoId}`
              : isRegularPlaylist
                ? `https://www.youtube.com/playlist?list=${playlistId}`
                : `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`;

          sendQueued(parentId, title ?? "Playlist", type);

          await runWithProgress({
            id: parentId,
            title: title ?? "Playlist",
            type,
            args: [
              url,
              ...formatArgs,
              "--yes-playlist",
              "--ignore-errors",
              "--no-abort-on-error",
              "--newline",
              "-o",
              path.join(savePath, "%(playlist_index)s - %(title)s.%(ext)s"),
              ...baseFlags(),
            ],
          });

          sendDone(parentId);
        }

        return { success: true };
      } catch (err) {
        console.error("❌ download:mix erro:", err);
        sendError(parentId, err.message);
        return { success: false, error: err.message };
      }
    },
  );
  // ── youtube:getMixInfo ───────────────────────────────────
  ipcMain.handle("youtube:getMixInfo", async (_, { videoId, playlistId }) => {
    try {
      const isRegularPlaylist = !playlistId.startsWith("RD");
      const url = isRegularPlaylist
        ? `https://www.youtube.com/playlist?list=${playlistId}`
        : `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`;

      const proc = spawn(
        ytDlpPath,
        [
          url,
          "--flat-playlist",
          "--dump-single-json",
          "--yes-playlist",
          ...baseFlagsPlaylist(),
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );

      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (d) => (stdout += d.toString()));
      proc.stderr.on("data", (d) => (stderr += d.toString()));

      return await new Promise((resolve) => {
        proc.on("close", (code) => {
          if (code !== 0) {
            console.error("getMixInfo stderr:", stderr);
            return resolve({ title: "Mix", count: null });
          }
          try {
            const data = JSON.parse(stdout);
            resolve({
              title: data.title ?? "Mix",
              count: data.entries?.length ?? null,
            });
          } catch {
            resolve({ title: "Mix", count: null });
          }
        });
      });
    } catch (err) {
      console.error("❌ getMixInfo erro:", err);
      return { title: "Mix", count: null };
    }
  });

  // ── youtube:getMixVideos ─────────────────────────────────
  ipcMain.handle("youtube:getMixVideos", async (_, { videoId, playlistId }) => {
    // Mix dinâmica — YouTube gera server-side, yt-dlp retorna lista diferente da UI
    // Frontend deve usar os videoIds já visíveis ao invés de chamar este handler
    if (playlistId.startsWith("RD")) {
      console.warn(
        "getMixVideos chamado para mix dinâmica — resultado pode divergir da UI",
      );
    }

    const isRegularPlaylist = !playlistId.startsWith("RD");
    const url = isRegularPlaylist
      ? `https://www.youtube.com/playlist?list=${playlistId}`
      : `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`;

    const args = [
      url,
      "--flat-playlist",
      "--yes-playlist",
      "--print",
      "%(id)s|||%(title)s",
      "--no-warnings",
      "--playlist-end",
      "25",
      ...baseFlagsPlaylist(),
    ];

    return new Promise((resolve) => {
      const proc = spawn(ytDlpPath, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (d) => (stdout += d));
      proc.stderr.on("data", (d) => (stderr += d));

      proc.on("error", (err) => {
        console.error("getMixVideos spawn error:", err);
        resolve({ success: false, videos: [] });
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          console.error("getMixVideos stderr:", stderr);
          return resolve({ success: false, videos: [] });
        }

        const videos = stdout
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line, idx) => {
            const sep = line.indexOf("|||");
            return {
              index: idx + 1,
              id: sep !== -1 ? line.slice(0, sep).trim() : line.trim(),
              title:
                sep !== -1 ? line.slice(sep + 3).trim() : `Vídeo ${idx + 1}`,
            };
          });

        console.log(`getMixVideos: ${videos.length} vídeos (ordem original)`);
        resolve({ success: true, videos });
      });
    });
  });
}
