import { ipcMain, app, session, shell, BrowserWindow } from "electron";
import { pathToFileURL } from "node:url";
import { getDatabase } from "./database.js";

import path from "path";
import fs from "fs";
import ffmpegStatic from "ffmpeg-static";
import { createRequire } from "module";
import os from "os";

const require = createRequire(import.meta.url);
const YTDlpWrapModule = require("yt-dlp-wrap");
const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule;

const ytDlpPath = path.join(
  app.getPath("userData"),
  process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp",
);
const ytDlp = new YTDlpWrap(ytDlpPath);

const cookiesPath = path.join(
  os.homedir(),
  "AppData",
  "Roaming",
  "meu-projeto",
  "cookies.txt",
);

// ─── Auth flags centralizados ────────────────────────────────────────────────
// Usa cookies.txt se existir e tiver conteúdo, senão pega direto do Chrome.
// Dessa forma nunca precisa exportar cookies manualmente.
function getAuthFlags() {
  try {
    const stat = fs.statSync(cookiesPath);
    if (stat.size > 100) return ["--cookies", cookiesPath];
  } catch {
    // arquivo não existe
  }
  return ["--cookies-from-browser", "chrome"];
}

function baseFlags() {
  return ["--no-playlist", "--js-runtimes", "node", ...getAuthFlags()];
}
// ─────────────────────────────────────────────────────────────────────────────

function withAudioSrc(row) {
  if (!row?.path) return row;
  return { ...row, src: pathToFileURL(row.path).href };
}

export function registerDatabaseHandlers() {
  // =========================
  // APP SETTINGS (key-value)
  // =========================

  ipcMain.handle("settings:get", (_, key) => {
    const row = getDatabase()
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .get(key);
    return row?.value ?? null;
  });

  ipcMain.handle("settings:set", (_, key, value) => {
    getDatabase()
      .prepare(
        `INSERT INTO app_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, String(value));
    return true;
  });

  // =========================
  // SONGS
  // =========================

  ipcMain.handle("db:songs:upsertMany", (_, songs = []) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO songs (title, artist, duration, path, cover, directory_id)
      VALUES (@title, @artist, @duration, @path, @cover, @directory_id)
      ON CONFLICT(path) DO UPDATE SET
        title = excluded.title,
        artist = excluded.artist,
        duration = excluded.duration,
        cover = excluded.cover,
        directory_id = excluded.directory_id
    `);
    const transaction = db.transaction((list) => {
      for (const song of list) {
        stmt.run({
          title: song.title ?? "Unknown",
          artist: song.artist ?? null,
          duration: song.duration ?? 0,
          path: song.path,
          cover: song.cover ?? null,
          directory_id: song.directory_id ?? null,
        });
      }
    });
    transaction(songs);
    return true;
  });

  ipcMain.handle("db:songs:getAll", () => {
    return getDatabase()
      .prepare("SELECT * FROM songs ORDER BY title COLLATE NOCASE")
      .all()
      .map(withAudioSrc);
  });

  ipcMain.handle("db:songs:getByDirectory", (_, id) => {
    return getDatabase()
      .prepare("SELECT * FROM songs WHERE directory_id = ?")
      .all(id)
      .map(withAudioSrc);
  });

  ipcMain.handle("db:songs:recordPlay", (_, songId) => {
    getDatabase()
      .prepare(
        `UPDATE songs SET play_count = COALESCE(play_count, 0) + 1,
         last_played = datetime('now') WHERE id = ?`,
      )
      .run(songId);
    return true;
  });

  // =========================
  // RECENTS
  // =========================

  ipcMain.handle("db:recents:add", (_, songId) => {
    getDatabase()
      .prepare(
        "INSERT INTO recents (song_id, played_at) VALUES (?, datetime('now'))",
      )
      .run(songId);
    return true;
  });

  ipcMain.handle("db:recents:list", (_, limit = 30) => {
    return getDatabase()
      .prepare(
        `SELECT songs.*, recents.played_at AS played_at
         FROM recents JOIN songs ON songs.id = recents.song_id
         ORDER BY recents.played_at DESC LIMIT ?`,
      )
      .all(limit);
  });

  ipcMain.handle("db:recents:clear", () => {
    getDatabase().prepare("DELETE FROM recents").run();
    return true;
  });

  // =========================
  // DIRECTORIES
  // =========================

  ipcMain.handle("db:directories:add", (_, dirPath) => {
    const db = getDatabase();
    db.prepare("INSERT OR IGNORE INTO directories (path) VALUES (?)").run(
      dirPath,
    );
    return db.prepare("SELECT * FROM directories WHERE path = ?").get(dirPath);
  });

  ipcMain.handle("db:songs:refreshDuration", async () => {
    const db = getDatabase();
    const songs = db.prepare("SELECT id, path FROM songs").all();
    const mm = await import("music-metadata");
    for (const song of songs) {
      try {
        const metadata = await mm.parseFile(song.path);
        const duration = metadata.format.duration || 0;
        db.prepare("UPDATE songs SET duration = ? WHERE id = ?").run(
          duration,
          song.id,
        );
      } catch (err) {
        console.error(`Falha ao atualizar ${song.path}:`, err);
      }
    }
    return true;
  });

  ipcMain.handle("db:directories:remove", (_, id) => {
    const db = getDatabase();
    const removeDir = db.transaction(() => {
      db.prepare(
        "DELETE FROM playlist_songs WHERE song_id IN (SELECT id FROM songs WHERE directory_id = ?)",
      ).run(id);
      db.prepare(
        "DELETE FROM favorites WHERE song_id IN (SELECT id FROM songs WHERE directory_id = ?)",
      ).run(id);
      db.prepare(
        "DELETE FROM recents WHERE song_id IN (SELECT id FROM songs WHERE directory_id = ?)",
      ).run(id);
      db.prepare("DELETE FROM songs WHERE directory_id = ?").run(id);
      db.prepare("DELETE FROM directories WHERE id = ?").run(id);
    });
    removeDir();
    return true;
  });

  ipcMain.handle("db:directories:list", () => {
    return getDatabase()
      .prepare("SELECT * FROM directories ORDER BY id DESC")
      .all();
  });

  // =========================
  // FAVORITES
  // =========================

  ipcMain.handle("db:favorites:add", (_, id) => {
    getDatabase()
      .prepare("INSERT OR IGNORE INTO favorites (song_id) VALUES (?)")
      .run(id);
    return true;
  });

  ipcMain.handle("db:favorites:remove", (_, id) => {
    getDatabase().prepare("DELETE FROM favorites WHERE song_id = ?").run(id);
    return true;
  });

  ipcMain.handle("db:favorites:list", () => {
    return getDatabase()
      .prepare(
        "SELECT songs.* FROM favorites JOIN songs ON songs.id = favorites.song_id",
      )
      .all();
  });

  ipcMain.handle("db:favorites:isFavorite", (_, songId) => {
    const row = getDatabase()
      .prepare("SELECT 1 AS ok FROM favorites WHERE song_id = ? LIMIT 1")
      .get(songId);
    return Boolean(row);
  });

  // =========================
  // PLAYLISTS
  // =========================

  ipcMain.handle("db:playlists:create", (_, name, cover = null) => {
    const db = getDatabase();
    const info = db
      .prepare("INSERT INTO playlists (name, cover) VALUES (?, ?)")
      .run(name, cover);
    return db
      .prepare("SELECT * FROM playlists WHERE id = ?")
      .get(info.lastInsertRowid);
  });

  ipcMain.handle("db:playlists:rename", (_, id, name) => {
    getDatabase()
      .prepare("UPDATE playlists SET name = ? WHERE id = ?")
      .run(name, id);
    return true;
  });

  ipcMain.handle("db:playlists:remove", (_, id) => {
    getDatabase().prepare("DELETE FROM playlists WHERE id = ?").run(id);
    return true;
  });

  ipcMain.handle("db:playlists:list", () => {
    return getDatabase()
      .prepare("SELECT * FROM playlists ORDER BY created_at DESC")
      .all();
  });

  ipcMain.handle("db:playlists:getSongs", (_, playlistId) => {
    return getDatabase()
      .prepare(
        `SELECT songs.* FROM playlist_songs
         JOIN songs ON songs.id = playlist_songs.song_id
         WHERE playlist_songs.playlist_id = ?
         ORDER BY playlist_songs.position ASC, songs.title COLLATE NOCASE`,
      )
      .all(playlistId)
      .map(withAudioSrc);
  });

  ipcMain.handle("db:playlists:addSong", (_, playlistId, songId) => {
    const db = getDatabase();
    const row = db
      .prepare(
        "SELECT COALESCE(MAX(position), -1) + 1 AS next FROM playlist_songs WHERE playlist_id = ?",
      )
      .get(playlistId);
    db.prepare(
      "INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)",
    ).run(playlistId, songId, row.next);
    return true;
  });

  ipcMain.handle("db:playlists:removeSong", (_, playlistId, songId) => {
    getDatabase()
      .prepare(
        "DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?",
      )
      .run(playlistId, songId);
    return true;
  });

  ipcMain.handle("db:playlists:reorder", (_, playlistId, songIds) => {
    const db = getDatabase();
    const tx = db.transaction(() => {
      const stmt = db.prepare(
        "UPDATE playlist_songs SET position = ? WHERE playlist_id = ? AND song_id = ?",
      );
      songIds.forEach((songId, position) =>
        stmt.run(position, playlistId, songId),
      );
    });
    tx();
    return true;
  });

  // =========================
  // YOUTUBE
  // =========================

  ipcMain.handle(
    "youtube:search",
    async (_, query, forceRefresh = false, rawQuery = false) => {
      return searchYoutube(query, forceRefresh, rawQuery);
    },
  );

  ipcMain.handle("youtube:getVideoFormats", async (_, videoId) => {
    console.log("IPC getVideoFormats recebido:", videoId);

    try {
      const output = await ytDlp.execPromise([
        `https://www.youtube.com/watch?v=${videoId}`,
        "--dump-json",
        ...baseFlags(),
      ]);

      const data = JSON.parse(output);
      const formats = data.formats || [];

      const videoMap = new Map();

      const video = formats
        .filter(
          (f) =>
            f.vcodec !== "none" &&
            f.height &&
            f.ext &&
            f.protocol !== "m3u8" &&
            f.protocol !== "m3u8_native",
        )
        .map((f) => ({
          id: f.format_id,
          height: f.height,
          resolution: `${f.height}p`,
          ext: f.ext,
          vcodec: f.vcodec,
          acodec: f.acodec,
          filesize: f.filesize || null,
          fps: f.fps || null,
          tbr: f.tbr || 0,
        }))
        // pega o melhor por resolução
        .sort((a, b) => b.tbr - a.tbr)
        .reduce((acc, f) => {
          if (!videoMap.has(f.height)) {
            videoMap.set(f.height, f);
            acc.push(f);
          }
          return acc;
        }, []);

      const audio = formats
        .filter((f) => f.vcodec === "none" && f.acodec !== "none")
        .map((f) => ({
          id: f.format_id,
          ext: f.ext,
          abr: f.abr || 0,
          filesize: f.filesize || null,
        }))
        .sort((a, b) => b.abr - a.abr);

      console.log(
        "Formatos vídeo:",
        video.map((v) => v.resolution),
      );
      console.log("Formatos áudio:", audio.length);

      return { video, audio };
    } catch (err) {
      console.error("❌ getVideoFormats erro:", err);
      return { video: [], audio: [] };
    }
  });

  ipcMain.handle("download:audio", async (_, { videoId, title }) => {
    try {
      const vibePath = path.join(app.getPath("music"), "Vibe");
      if (!fs.existsSync(vibePath)) fs.mkdirSync(vibePath, { recursive: true });
      const safeTitle = (title ?? "audio").replace(/[<>:"/\\|?*]/g, "").trim();
      const filePath = path.join(vibePath, `${safeTitle}.mp3`);

      await ytDlp.execPromise([
        `https://www.youtube.com/watch?v=${videoId}`,
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
        "--ffmpeg-location",
        ffmpegStatic,
        "-o",
        filePath,
        ...baseFlags(),
      ]);

      return { success: true, path: filePath };
    } catch (err) {
      console.error("❌ download:audio erro:", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("download:video", async (_, { videoId, title, formatId }) => {
    try {
      const vibePath = path.join(app.getPath("videos"), "Vibe");
      if (!fs.existsSync(vibePath)) fs.mkdirSync(vibePath, { recursive: true });
      const safeTitle = (title ?? "video").replace(/[<>:"/\\|?*]/g, "").trim();
      const filePath = path.join(vibePath, `${safeTitle}.mp4`);

      await new YTDlpWrap(ytDlpPath).execPromise([
        `https://www.youtube.com/watch?v=${videoId}`,
        "-f",
        `${formatId}+bestaudio[ext=m4a]/${formatId}+bestaudio/best`,
        "--merge-output-format",
        "mp4",
        "--ffmpeg-location",
        ffmpegStatic,
        "-o",
        filePath,
        ...baseFlags(),
      ]);

      return { success: true, path: filePath };
    } catch (err) {
      console.error("❌ download:video erro:", err);
      return { success: false, error: err.message };
    }
  });

  // =========================
  // GOOGLE AUTH
  // =========================

  ipcMain.handle("google:login-external", async () => {
    return new Promise((resolve) => {
      const loginWin = new BrowserWindow({
        width: 500,
        height: 680,
        title: "Entrar com Google",
        webPreferences: {
          partition: "persist:google-login", // sessão isolada pra não sujar
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      loginWin.loadURL(
        "https://accounts.google.com/ServiceLogin?service=youtube",
      );

      // Detecta quando o cookie de sessão do Google aparece
      const targetSession = session.fromPartition("persist:google-login");

      const cookieCheck = setInterval(async () => {
        const cookies = await targetSession.cookies.get({
          domain: ".google.com",
        });
        const loggedIn = cookies.some(
          (c) => c.name === "SID" || c.name === "SSID" || c.name === "HSID",
        );
        if (loggedIn) {
          clearInterval(cookieCheck);
          loginWin.close();
          resolve(true);
        }
      }, 1500);

      // Usuário fechou a janela manualmente
      loginWin.on("closed", () => {
        clearInterval(cookieCheck);
        resolve(false);
      });
    });
  });

  ipcMain.handle("google:import-cookies", async () => {
    const loginSession = session.fromPartition("persist:google-login");
    const youtubeSession = session.fromPartition("persist:youtube");
    const domains = [".youtube.com", ".google.com", "accounts.google.com"];

    let total = 0;
    for (const domain of domains) {
      const cookies = await loginSession.cookies.get({ domain });
      console.log(`🍪 [${domain}] encontrados: ${cookies.length} cookies`);
      console.log(cookies.map((c) => c.name).join(", "));

      for (const cookie of cookies) {
        if (
          cookie.name.startsWith("__Host-") ||
          cookie.name.startsWith("__Secure-")
        )
          continue;

        try {
          await youtubeSession.cookies.set({
            url: `https://${cookie.domain.replace(/^\./, "")}`,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            expirationDate: cookie.expirationDate,
          });
          total++;
        } catch (err) {
          console.warn(`⚠️ Cookie ignorado [${cookie.name}]:`, err.message);
        }
      }
    }

    console.log(`✅ Total de cookies copiados: ${total}`);
    return true;
  });

  ipcMain.handle("google:logout", async () => {
    const youtubeSession = session.fromPartition("persist:youtube");
    await youtubeSession.clearStorageData({
      storages: ["cookies", "localstorage", "sessionstorage", "cachestorage"],
    });
    return true;
  });
}
