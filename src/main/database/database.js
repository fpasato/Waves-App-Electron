import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";

let db = null;

// =========================
// INIT DATABASE
// =========================
export function initDatabase() {
  if (db) return db;

  const dbPath = path.join(app.getPath("userData"), "music.db");

  db = new Database(dbPath);

  console.log("📦 Database initialized:", dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  createTables();

  return db;
}

// =========================
// GET DATABASE
// =========================
export function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

// =========================
// CLOSE DATABASE
// =========================
export function closeDatabase() {
  if (!db) return;

  db.close();
  db = null;

  console.log("🛑 Database closed");
}

// =========================
// SCHEMA
// =========================
function createTables() {
  db.exec(`
    -- =========================
    -- DIRECTORIES
    -- =========================
    CREATE TABLE IF NOT EXISTS directories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL
    );

    -- =========================
    -- SONGS
    -- =========================
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT,
      duration INTEGER,
      path TEXT UNIQUE NOT NULL,
      cover TEXT,
      directory_id INTEGER,
      play_count INTEGER DEFAULT 0,
      last_played DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY(directory_id)
        REFERENCES directories(id)
        ON DELETE CASCADE
    );

    -- =========================
    -- FAVORITES
    -- =========================
    CREATE TABLE IF NOT EXISTS favorites (
      song_id INTEGER PRIMARY KEY,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY(song_id)
        REFERENCES songs(id)
        ON DELETE CASCADE
    );

    -- =========================
    -- RECENTS
    -- =========================
    CREATE TABLE IF NOT EXISTS recents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id INTEGER NOT NULL,
      played_at DATETIME,

      FOREIGN KEY(song_id)
        REFERENCES songs(id)
        ON DELETE CASCADE
    );

    -- =========================
    -- PLAYLISTS
    -- =========================
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cover TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =========================
    -- PLAYLIST SONGS
    -- =========================
    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id INTEGER NOT NULL,
      song_id INTEGER NOT NULL,
      position INTEGER DEFAULT 0,

      PRIMARY KEY (playlist_id, song_id),

      FOREIGN KEY(playlist_id)
        REFERENCES playlists(id)
        ON DELETE CASCADE,

      FOREIGN KEY(song_id)
        REFERENCES songs(id)
        ON DELETE CASCADE
    );

    -- =========================
    -- APP SETTINGS (chave/valor)
    -- =========================
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}