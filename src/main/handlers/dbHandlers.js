// src/main/handlers/dbHandlers.js
import { ipcMain } from "electron";
import { withAudioSrc } from "../utils.js";
import fs from "fs";
/**
 * Registra todos os handlers relacionados ao banco de dados local.
 * @param {import('better-sqlite3').Database} db - Instância do banco
 */
export function registerDbHandlers(db) {
  // =========================
  // APP SETTINGS
  // =========================
  ipcMain.handle("settings:get", (_, key) => {
    const row = db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .get(key);
    return row?.value ?? null;
  });

  ipcMain.handle("settings:set", (_, key, value) => {
    db.prepare(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run(key, String(value));
    return true;
  });

  // =========================
  // SONGS
  // =========================
  ipcMain.handle("db:songs:upsertMany", (_, songs = []) => {
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
    return db
      .prepare("SELECT * FROM songs ORDER BY title COLLATE NOCASE")
      .all()
      .map(withAudioSrc);
  });

  ipcMain.handle("db:songs:rename", (_, oldPath, newPath) => {
    db.prepare("UPDATE songs SET path = ? WHERE path = ?").run(
      newPath,
      oldPath,
    );
    return true;
  });

  ipcMain.handle("db:songs:getByDirectory", (_, id) => {
    return db
      .prepare("SELECT * FROM songs WHERE directory_id = ?")
      .all(id)
      .map(withAudioSrc);
  });

  ipcMain.handle("fs:exists", (_, filePath) => {
    return fs.existsSync(filePath);
  });
  // dbHandlers.js
  ipcMain.handle("db:songs:removeInvalid", () => {
    const songs = db.prepare("SELECT id, path FROM songs").all();
    const removed = [];
    for (const song of songs) {
      if (!fs.existsSync(song.path)) {
        db.prepare("DELETE FROM songs WHERE id = ?").run(song.id);
        removed.push(song.path);
      }
    }
    return removed;
  });
  ipcMain.handle("db:songs:recordPlay", (_, songId) => {
    db.prepare(
      `UPDATE songs SET play_count = COALESCE(play_count, 0) + 1,
       last_played = datetime('now') WHERE id = ?`,
    ).run(songId);
    return true;
  });

  // =========================
  // RECENTS
  // =========================
  ipcMain.handle("db:recents:add", (_, songId) => {
    db.prepare(
      "INSERT INTO recents (song_id, played_at) VALUES (?, datetime('now'))",
    ).run(songId);
    return true;
  });

  ipcMain.handle("db:recents:list", (_, limit = 30) => {
    return db
      .prepare(
        `SELECT songs.*, recents.played_at AS played_at
       FROM recents JOIN songs ON songs.id = recents.song_id
       ORDER BY recents.played_at DESC LIMIT ?`,
      )
      .all(limit);
  });

  ipcMain.handle("db:recents:clear", () => {
    db.prepare("DELETE FROM recents").run();
    return true;
  });

  // =========================
  // DIRECTORIES
  // =========================
  ipcMain.handle("db:directories:add", (_, dirPath) => {
    db.prepare("INSERT OR IGNORE INTO directories (path) VALUES (?)").run(
      dirPath,
    );
    return db.prepare("SELECT * FROM directories WHERE path = ?").get(dirPath);
  });

  ipcMain.handle("db:songs:refreshDuration", async () => {
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
    return db.prepare("SELECT * FROM directories ORDER BY id DESC").all();
  });

  // =========================
  // FAVORITES
  // =========================
  ipcMain.handle("db:favorites:add", (_, id) => {
    db.prepare("INSERT OR IGNORE INTO favorites (song_id) VALUES (?)").run(id);
    return true;
  });

  ipcMain.handle("db:favorites:remove", (_, id) => {
    db.prepare("DELETE FROM favorites WHERE song_id = ?").run(id);
    return true;
  });

  ipcMain.handle("db:favorites:list", () => {
    return db
      .prepare(
        "SELECT songs.* FROM favorites JOIN songs ON songs.id = favorites.song_id",
      )
      .all();
  });

  ipcMain.handle("db:favorites:isFavorite", (_, songId) => {
    const row = db
      .prepare("SELECT 1 AS ok FROM favorites WHERE song_id = ? LIMIT 1")
      .get(songId);
    return Boolean(row);
  });

  // =========================
  // PLAYLISTS
  // =========================
  ipcMain.handle("db:playlists:create", (_, name, cover = null) => {
    const info = db
      .prepare("INSERT INTO playlists (name, cover) VALUES (?, ?)")
      .run(name, cover);
    return db
      .prepare("SELECT * FROM playlists WHERE id = ?")
      .get(info.lastInsertRowid);
  });

  ipcMain.handle("db:playlists:rename", (_, id, name) => {
    db.prepare("UPDATE playlists SET name = ? WHERE id = ?").run(name, id);
    return true;
  });

  ipcMain.handle("db:playlists:remove", (_, id) => {
    db.prepare("DELETE FROM playlists WHERE id = ?").run(id);
    return true;
  });

  ipcMain.handle("db:playlists:list", () => {
    return db.prepare("SELECT * FROM playlists ORDER BY created_at DESC").all();
  });

  ipcMain.handle("db:playlists:getSongs", (_, playlistId) => {
    return db
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
    db.prepare(
      "DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?",
    ).run(playlistId, songId);
    return true;
  });

  ipcMain.handle("db:playlists:reorder", (_, playlistId, songIds) => {
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

  ipcMain.removeHandler("fs:rename");
  ipcMain.handle("fs:rename", async (_, oldPath, newPath) => {
    await fs.promises.rename(oldPath, newPath);
  });
}
