export function useDirectories() {
  return {
    addDirectory: (path) =>
      window.api.db.directories.add(path),

    removeDirectory: (id) =>
      window.api.db.directories.remove(id),

    listDirectories: () =>
      window.api.db.directories.list(),
  }
}

export function useSongs() {
  return {
    getAllSongs: () =>
      window.api.db.songs.getAll(),

    getSongsByDirectory: (dirId) =>
      window.api.db.songs.getByDirectory(dirId),

    upsertManySongs: (songs) =>
      window.api.db.songs.upsertMany(songs),
  }
}

export function useFavorites() {
  return {
    addFavorite: (songId) =>
      window.api.db.favorites.add(songId),

    removeFavorite: (songId) =>
      window.api.db.favorites.remove(songId),

    isFavorite: (songId) =>
      window.api.db.favorites.isFavorite(songId),

    listFavorites: () =>
      window.api.db.favorites.list(),
  }
}

export function useRecents() {
  return {
    addRecent: (songId) =>
      window.api.db.recents.add(songId),

    listRecents: (limit = 20) =>
      window.api.db.recents.list(limit),

    clearRecents: () =>
      window.api.db.recents.clear(),
  }
}

export function usePlaylists() {
  return {
    createPlaylist: (name, cover = null) =>
      window.api.db.playlists.create(name, cover),

    renamePlaylist: (id, name) =>
      window.api.db.playlists.rename(id, name),

    removePlaylist: (id) =>
      window.api.db.playlists.remove(id),

    listPlaylists: () =>
      window.api.db.playlists.list(),

    getPlaylistSongs: (playlistId) =>
      window.api.db.playlists.getSongs(playlistId),

    addSongToPlaylist: (playlistId, songId) =>
      window.api.db.playlists.addSong(playlistId, songId),

    removeSongFromPlaylist: (playlistId, songId) =>
      window.api.db.playlists.removeSong(playlistId, songId),

    reorderPlaylist: (playlistId, songIds) =>
      window.api.db.playlists.reorder(playlistId, songIds),
  }
}

