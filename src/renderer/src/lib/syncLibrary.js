import {
  removeYoutubeChannel,
  cleanArtist,
  cleanFull,
  splitArtistTitle,
} from "./titleUtils";

export function mapTracksForDb(tracks, directoryId) {
  return tracks.map((t) => ({
    title: t.title,
    artist: t.artist,
    duration: t.duration,
    path: t.path ?? t.id,
    cover: t.cover ?? null,
    directory_id: directoryId,
  }));
}

export async function refreshLibraryFromDisk() {
  const dirs = await window.api.db.directories.list();

  for (const dir of dirs) {
    const tracks = await window.api.music.scanFolder(dir.path);
    if (tracks.length === 0) continue;
    await window.api.db.songs.upsertMany(mapTracksForDb(tracks, dir.id));
  }
  await window.api.db.songs.removeInvalid();
  return window.api.db.songs.getAll();
}

function getFileNameWithoutExtension(filePath) {
  const parts = filePath.split(/[\\/]/);
  const name = parts[parts.length - 1];
  const dot = name.lastIndexOf(".");
  return dot === -1 ? name : name.substring(0, dot);
}

function sanitizeFileName(str) {
  return str.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim();
}

function resolveArtistTitle(fileName, metaArtist, metaTitle) {
  if (fileName) {
    const split = splitArtistTitle(removeYoutubeChannel(fileName));
    if (split) {
      const artist = cleanArtist(split.artist);
      const title = cleanFull(split.title);
      if (artist && title) return { artist, title };
    }
  }
  const artist = cleanArtist(metaArtist);
  const title = cleanFull(metaTitle);
  if (artist && title) return { artist, title };

  const a2 = cleanArtist(metaTitle);
  const t2 = cleanFull(metaArtist);
  if (a2 && t2) return { artist: a2, title: t2 };

  return { artist: null, title: null };
}

// 📌 Gemini só via IPC (seguro, sem process)
async function fetchArtistTitleFromGemini(fileName) {
  const result = await window.electronAPI.parseFilenameWithGemini(fileName);
  return result; // { artist, title } já vêm limpos do main process
}

export async function normalizeLibraryFileNames(onProgress) {
  await window.api.db.songs.removeInvalid();
  const songs = await window.api.db.songs.getAll();
  const report = { renamed: [], skipped: [], errors: [] };

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    onProgress?.({ current: i + 1, total: songs.length, song });

    try {
      // verifica se o arquivo existe antes de tudo
      const exists = await window.electronAPI.fs.exists(song.path);
      if (!exists) {
        report.skipped.push({
          path: song.path,
          reason: "arquivo não encontrado no disco",
        });
        continue;
      }

      const dir = song.path.replace(/[\\/][^\\/]+$/, "");
      const ext = song.path.match(/\.[^.]+$/)?.[0] ?? ".mp3";
      const fileName = getFileNameWithoutExtension(song.path);

      let { artist, title } = resolveArtistTitle(
        fileName,
        song.artist,
        song.title,
      );

      if (!artist || !title) {
        const geminiResult = await fetchArtistTitleFromGemini(fileName);
        if (geminiResult.artist && geminiResult.title) {
          artist = geminiResult.artist;
          title = geminiResult.title;
        }
      }

      if (!artist || !title) {
        report.skipped.push({
          path: song.path,
          reason: "não foi possível extrair",
        });
        continue;
      }

      const newName = `${sanitizeFileName(artist)} - ${sanitizeFileName(title)}${ext}`;
      const newPath = `${dir}\\${newName}`;

      if (newPath === song.path) {
        report.skipped.push({ path: song.path, reason: "já está no padrão" });
        continue;
      }

      // se o destino já existe, pula pra não sobrescrever
      const destExists = await window.electronAPI.fs.exists(newPath);
      if (destExists) {
        report.skipped.push({ path: song.path, reason: "destino já existe" });
        continue;
      }

      await window.electronAPI.fs.rename(song.path, newPath);
      await window.api.db.songs.renameSong(song.path, newPath);

      report.renamed.push({ from: song.path, to: newPath });
    } catch (err) {
      report.errors.push({ path: song.path, error: err.message });
    }
  }

  return report;
}

export async function reloadLibraryFromDb() {
  return window.api.db.songs.getAll();
}
