// src/main/handlers/downloads.js
import { ipcMain, app, shell, session } from "electron";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { execSync } from "child_process";
import { StringDecoder } from "string_decoder";

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
    video: path.join(app.getPath("documents"), "Waves", "video"),
    audio: path.join(app.getPath("documents"), "Waves", "audios"),
    radio: path.join(app.getPath("documents"), "Waves", "gravações de radio"),
  };
  const activeProcesses = new Map();
  const cancelledIds = new Set();

  let cachedCookiePath = null;
  let lastCookieExport = 0;
  const COOKIE_CACHE_TTL = 5 * 60 * 1000;

  async function getCookieFlags() {
    const now = Date.now();
    if (
      cachedCookiePath &&
      now - lastCookieExport < COOKIE_CACHE_TTL &&
      fs.existsSync(cachedCookiePath)
    ) {
      return ["--cookies", cachedCookiePath];
    }
    try {
      const ses = session.fromPartition("persist:youtube");
      const cookies = await ses.cookies.get({ domain: "youtube.com" });
      if (!cookies || cookies.length === 0) return [];

      const lines = ["# Netscape HTTP Cookie File"];
      for (const c of cookies) {
        const domain = c.domain.startsWith(".") ? c.domain : "." + c.domain;
        const expiry = c.expirationDate
          ? Math.floor(c.expirationDate)
          : Math.floor(now / 1000) + 60 * 60 * 24 * 30;
        lines.push(
          [
            domain,
            c.domain.startsWith(".") ? "TRUE" : "FALSE",
            c.path || "/",
            c.secure ? "TRUE" : "FALSE",
            expiry,
            c.name,
            c.value,
          ].join("\t"),
        );
      }

      const cookiePath = path.join(app.getPath("userData"), "yt-cookies.txt");
      fs.writeFileSync(cookiePath, lines.join("\n") + "\n", "utf8");
      cachedCookiePath = cookiePath;
      lastCookieExport = now;
      return ["--cookies", cookiePath];
    } catch (err) {
      console.error("getCookieFlags erro:", err);
      return [];
    }
  }

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

  function sendCancelled(id, title, type) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("download:cancelled", { id, title, type });
    }
  }

  // downloads.js — função runWithProgress

  function runWithProgress({ args, id, title, type, cwd, onCancel }) {
    return new Promise((resolve, reject) => {
      const proc = spawn(ytDlpPath, args, {
        stdio: ["ignore", "pipe", "pipe"],
        cwd: cwd ?? app.getPath("temp"),
        windowsHide: true,
      });

      let cancelled = false;

      function deletePartFiles(dir) {
        try {
          const entries = fs.readdirSync(dir);
          for (const name of entries) {
            if (name.endsWith(".part") || name.endsWith(".ytdl")) {
              const filePath = path.join(dir, name);
              try {
                fs.unlinkSync(filePath);
                console.log("Deletado:", filePath);
              } catch (e) {
                console.warn("Não foi possível deletar:", filePath, e.message);
              }
            }
          }
        } catch (e) {
          console.warn("deletePartFiles erro:", e.message);
        }
      }

      const killProc = () => {
        cancelled = true;
        if (onCancel) onCancel();
        if (process.platform === "win32") {
          try {
            execSync(`taskkill /pid ${proc.pid} /f /t`, { stdio: "ignore" });
          } catch (e) {}
        } else {
          try {
            process.kill(-proc.pid, "SIGKILL");
          } catch {
            proc.kill("SIGKILL");
          }
        }
        setTimeout(() => deletePartFiles(cwd ?? app.getPath("temp")), 1000);
      };

      activeProcesses.set(id, { proc, cancel: killProc });

      let buffer = "";
      let stderrBuffer = "";

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
      proc.stderr.on("data", (chunk) => {
        stderrBuffer += chunk.toString();
        handleChunk(chunk);
      });

      proc.on("close", (code) => {
        activeProcesses.delete(id);
        if (cancelled) {
          cancelledIds.delete(id);
          sendCancelled(id, title, type); // ← já temos title e type
          return resolve({ cancelled: true });
        }
        cancelledIds.delete(id);
        if (code === 0 || code === null) {
          resolve({ cancelled: false }); // ← sucesso
        } else {
          reject(
            new Error(
              `yt-dlp saiu com código ${code}\n${stderrBuffer.slice(-500)}`,
            ),
          );
        }
      });

      proc.on("error", (err) => {
        activeProcesses.delete(id);
        cancelledIds.delete(id);
        if (cancelled) {
          sendCancelled(id, title, type);
          return resolve({ cancelled: true });
        }
        reject(err);
      });
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

  ipcMain.handle("downloads:listVideos", async () => {
    const dir = path.join(app.getPath("documents"), "Waves", "video");
    await fs.promises.mkdir(dir, { recursive: true }); // garante que a pasta existe
    const files = await fs.promises.readdir(dir).catch(() => []);
    return files
      .filter((f) => /\.(mp4|webm|mkv|mov)$/i.test(f))
      .map((f) => ({
        filename: f,
        title: f.replace(/\.[^.]+$/, "").replace(/_/g, " "),
        path: path.join(dir, f),
      }));
  });

  // ── download:video ──────────────────────────────────────
  ipcMain.handle("download:video", async (_, { videoId, title, formatId }) => {
    const id = `video-${videoId}-${randomUUID()}`;
    sendQueued(id, title, "video");

    await new Promise((r) => setTimeout(r, 0));
    if (cancelledIds.has(id)) {
      cancelledIds.delete(id);
      sendCancelled(id);
      return { success: false, error: "cancelled" };
    }

    try {
      const savePath = DOWNLOAD_DIRS.video;
      fs.mkdirSync(savePath, { recursive: true });
      const safeTitle = (title ?? "video").replace(/[<>:"/\\|?*]/g, "").trim();
      const filePath = path.join(savePath, `${safeTitle}.mp4`);

      sendProgress({ id, title, type: "video", percent: 0 });

      const result = await runWithProgress({
        id,
        title,
        type: "video",
        cwd: savePath,
        args: [
          `https://www.youtube.com/watch?v=${videoId}`,
          "-f",
          `${formatId}+bestaudio[ext=m4a]/${formatId}+bestaudio/best`,
          "--merge-output-format",
          "mp4",
          "--ffmpeg-location",
          ffmpegPath,
          "--newline",
          "--force-overwrites",
          "-o",
          filePath,
          ...baseFlags(),
        ],
      });

      if (!result.cancelled) {
        sendDone(id);
      }
      return { success: true, path: filePath };
    } catch (err) {
      console.error("download:video erro:", err);
      sendError(id, err.message);
      return { success: false, error: err.message };
    }
  });

  // ── download:audio ──────────────────────────────────────
  ipcMain.handle("download:audio", async (_, { videoId, title, formatId }) => {
    const id = `audio-${videoId}-${randomUUID()}`;
    sendQueued(id, title, "audio");

    await new Promise((r) => setTimeout(r, 0));
    if (cancelledIds.has(id)) {
      cancelledIds.delete(id);
      sendCancelled(id);
      return { success: false, error: "cancelled" };
    }

    try {
      const savePath = DOWNLOAD_DIRS.audio;
      fs.mkdirSync(savePath, { recursive: true });
      const safeTitle = (title ?? "audio").replace(/[<>:"/\\|?*]/g, "").trim();
      const filePath = path.join(savePath, `${safeTitle}.%(ext)s`);

      sendProgress({ id, title, type: "audio", percent: 0 });

      const result = await runWithProgress({
        id,
        title,
        type: "audio",
        cwd: savePath,
        args: [
          `https://www.youtube.com/watch?v=${videoId}`,
          "-f",
          formatId,
          "--newline",
          "--force-overwrites",
          "-o",
          filePath,
          ...baseFlags(),
        ],
      });

      if (!result.cancelled) {
        sendDone(id);
      }
      return { success: true, path: filePath };
    } catch (err) {
      console.error("download:audio erro:", err);
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

        // downloadOne agora retorna o resultado de runWithProgress
        const downloadOne = async (id, vid, childTitle) => {
          return runWithProgress({
            id,
            title: childTitle,
            type,
            cwd: savePath,
            args: [
              `https://www.youtube.com/watch?v=${vid}`,
              ...formatArgs,
              "--no-playlist",
              "--newline",
              "--force-overwrites",
              "-o",
              path.join(savePath, "%(title)s.%(ext)s"),
              ...(await getCookieFlags()),
              ...baseFlagsPlaylist(),
            ],
          });
        };

        if (videoIds && videoIds.length > 0) {
          const items = videoIds.map((vid, i) => {
            const childId = `mix-${playlistId}-${vid}-${randomUUID()}`;
            const childTitle =
              videoTitles?.[i] ?? `${title} (${i + 1}/${videoIds.length})`;
            sendQueued(childId, childTitle, type);
            return { id: childId, vid, childTitle };
          });

          for (const item of items) {
            if (cancelledIds.has(parentId)) {
              sendCancelled(item.id);
              continue;
            }
            if (cancelledIds.has(item.id)) {
              sendCancelled(item.id);
              continue;
            }

            const result = await downloadOne(
              item.id,
              item.vid,
              item.childTitle,
            );
            if (!result.cancelled) {
              sendDone(item.id); // só envia 'done' se NÃO foi cancelado
            }
          }
          // REMOVIDO o segundo loop duplicado que existia aqui
        } else {
          // Playlist/mix inteira
          const url =
            mode === "single"
              ? `https://www.youtube.com/watch?v=${videoId}`
              : isRegularPlaylist
                ? `https://www.youtube.com/playlist?list=${playlistId}`
                : `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`;

          sendQueued(parentId, title ?? "Playlist", type);

          const result = await runWithProgress({
            id: parentId,
            title: title ?? "Playlist",
            type,
            cwd: savePath,
            args: [
              url,
              ...formatArgs,
              "--yes-playlist",
              "--ignore-errors",
              "--no-abort-on-error",
              "--newline",
              "--force-overwrites",
              "-o",
              path.join(savePath, "%(playlist_index)s - %(title)s.%(ext)s"),
              ...baseFlags(),
            ],
          });

          if (!result.cancelled) {
            sendDone(parentId);
          }
        }

        return { success: true };
      } catch (err) {
        console.error("download:mix erro:", err);
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

      const PRIVATE_LISTS = ["WL", "LL"];
      if (PRIVATE_LISTS.includes(playlistId) || playlistId?.startsWith("RD")) {
        return {
          title:
            playlistId === "WL"
              ? "Assistir mais tarde"
              : playlistId === "LL"
                ? "Vídeos curtidos"
                : "Mix",
          count: null,
        };
      }
      const proc = spawn(
        ytDlpPath,
        [
          url,
          "--flat-playlist",
          "--dump-single-json",
          "--yes-playlist",
          ...(await getCookieFlags()),
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
      console.error("getMixInfo erro:", err);
      return { title: "Mix", count: null };
    }
  });

  // ── youtube:getMixVideos ─────────────────────────────────
  ipcMain.handle("youtube:getMixVideos", async (_, { videoId, playlistId }) => {
    const isMix = playlistId?.startsWith("RD");

    // Mix é tratada pelo webview no renderer, não pelo yt-dlp
    if (isMix) {
      return { success: true, videos: [] };
    }

    const url = `https://www.youtube.com/playlist?list=${playlistId}`;

    const args = [
      url,
      "--flat-playlist",
      "--yes-playlist",
      "--print",
      "%(id)s|||%(title)s",
      "--playlist-end",
      "25",
      "--no-warnings",
      ...(await getCookieFlags()),
      ...baseFlagsPlaylist(),
    ];

    return new Promise((resolve) => {
      const proc = spawn(ytDlpPath, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      const stdoutDecoder = new StringDecoder("utf8");
      const stderrDecoder = new StringDecoder("utf8");
      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (chunk) => {
        stdout += stdoutDecoder.write(chunk);
      });

      proc.stderr.on("data", (chunk) => {
        stderr += stderrDecoder.write(chunk);
      });

      proc.on("error", (err) => {
        console.error("youtube:getMixVideos:", err);
        stdout += stdoutDecoder.end();
        stderr += stderrDecoder.end();
        resolve({
          success: false,
          videos: [],
        });
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          console.error(
            "youtube:getMixVideos failed:",
            stderr || `Exit code ${code}`,
          );

          return resolve({
            success: false,
            videos: [],
          });
        }

        const videos = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line, index) => {
            const [id, title] = line.split("|||");

            return {
              index: index + 1,
              id: id?.trim(),
              title: title?.trim() || `Vídeo ${index + 1}`,
            };
          });

        console.log(
          `youtube:getMixVideos -> ${videos.length} vídeos encontrados`,
        );

        resolve({
          success: true,
          videos,
        });
      });
    });
  });

  ipcMain.handle("downloads:cancel", (_, id) => {
    cancelledIds.add(id);
    const entry = activeProcesses.get(id);
    if (entry) {
      entry.cancel();
      activeProcesses.delete(id);
    } else {
      sendCancelled(id); 
    }
  });
}
