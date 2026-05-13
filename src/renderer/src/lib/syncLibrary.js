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

/** Lista de músicas na DB (sem voltar a escanear pastas). */
export async function reloadLibraryFromDb() {
  return window.api.db.songs.getAll();
}

/** Re-escaneia todas as pastas registadas e devolve a lista atualizada da DB. */
export async function refreshLibraryFromDisk() {
  const dirs = await window.api.db.directories.list();
  for (const dir of dirs) {
    const tracks = await window.api.music.scanFolder(dir.path);
    if (tracks.length === 0) continue;
    await window.api.db.songs.upsertMany(mapTracksForDb(tracks, dir.id));
  }
  return window.api.db.songs.getAll();
}
