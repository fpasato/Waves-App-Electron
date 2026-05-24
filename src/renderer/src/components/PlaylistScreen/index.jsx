// PlaylistScreen/index.jsx
import { useState, useEffect } from "react";
import styles from "./style.module.css";
import { randomCover } from "../../utils/randomCover";
import { usePlayerStore } from "../../store/playerStore";

export function PlaylistScreen() {
  const [playlists, setPlaylists] = useState([]);
  const [openPlaylist, setOpenPlaylist] = useState(null);
  const [playlistSongIds, setPlaylistSongIds] = useState(new Set());
  const [allSongs, setAllSongs] = useState([]);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingName, setCreatingName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const { playSong } = usePlayerStore();

  async function loadPlaylists() {
    const list = await window.api.db.playlists.list();
    setPlaylists(list);
  }

  useEffect(() => {
    loadPlaylists();
  }, []);

  async function handleOpenPlaylist(playlist) {
    setOpenPlaylist(playlist);
    setSearch("");
    const [library, plSongs] = await Promise.all([
      window.api.db.songs.getAll(),
      window.api.db.playlists.getSongs(playlist.id),
    ]);
    setAllSongs(library);
    setPlaylistSongIds(new Set(plSongs.map((s) => s.id)));
  }

  async function handleToggleSong(song) {
    if (playlistSongIds.has(song.id)) {
      await window.api.db.playlists.removeSong(openPlaylist.id, song.id);
      setPlaylistSongIds((prev) => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
    } else {
      await window.api.db.playlists.addSong(openPlaylist.id, song.id);
      setPlaylistSongIds((prev) => new Set(prev).add(song.id));
    }
  }

  function handlePlayAll() {
    const songs = allSongs.filter((s) => playlistSongIds.has(s.id));
    if (songs.length === 0) return;
    playSong(songs[0], songs);
  }

  function handlePlaySong(song) {
    const songs = allSongs.filter((s) => playlistSongIds.has(s.id));
    playSong(song, songs.length > 0 ? songs : [song]);
  }

  async function handleCreate() {
    const name = creatingName.trim();
    if (!name) return;
    await window.api.db.playlists.create(name);
    setCreatingName("");
    setShowCreate(false);
    loadPlaylists();
  }

  async function handleRename(id) {
    const name = renameValue.trim();
    if (!name) return;
    await window.api.db.playlists.rename(id, name);
    setRenamingId(null);
    if (openPlaylist?.id === id) setOpenPlaylist((p) => ({ ...p, name }));
    loadPlaylists();
  }

  async function handleRemove(id) {
    await window.api.db.playlists.remove(id);
    if (openPlaylist?.id === id) setOpenPlaylist(null);
    loadPlaylists();
  }

  // ---- VIEW: dentro da playlist ----
  if (openPlaylist) {
    const filtered = allSongs.filter((s) =>
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.artist?.toLowerCase().includes(search.toLowerCase())
    );

    const inPlaylist = filtered.filter((s) => playlistSongIds.has(s.id));
    const notInPlaylist = filtered.filter((s) => !playlistSongIds.has(s.id));

    return (
      <div className={styles.playlists}>
        <div className={styles.playlistsHeader}>
          <button className={styles.backButton} onClick={() => setOpenPlaylist(null)}>
            ← voltar
          </button>
          <h1 className={styles.playlistsTitle}>{openPlaylist.name}</h1>
          <button className={styles.playAllButton} onClick={handlePlayAll}>
            ▶ tocar
          </button>
        </div>

        <input
          className={styles.input}
          placeholder="Buscar música..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.songsList}>
          {inPlaylist.length > 0 && (
            <>
              <p className={styles.sectionLabel}>Na playlist ({inPlaylist.length})</p>
              {inPlaylist.map((song) => (
                <SongRow
                  key={song.id}
                  song={song}
                  inPlaylist
                  onPlay={() => handlePlaySong(song)}
                  onToggle={() => handleToggleSong(song)}
                />
              ))}
            </>
          )}

          {notInPlaylist.length > 0 && (
            <>
              <p className={styles.sectionLabel}>Biblioteca ({notInPlaylist.length})</p>
              {notInPlaylist.map((song) => (
                <SongRow
                  key={song.id}
                  song={song}
                  inPlaylist={false}
                  onPlay={() => handlePlaySong(song)}
                  onToggle={() => handleToggleSong(song)}
                />
              ))}
            </>
          )}

          {filtered.length === 0 && (
            <p className={styles.empty}>Nenhuma música encontrada.</p>
          )}
        </div>
      </div>
    );
  }

  // ---- VIEW: lista de playlists ----
  return (
    <div className={styles.playlists}>
      <div className={styles.playlistsHeader}>
        <h1 className={styles.playlistsTitle}>Playlists</h1>
        <button className={styles.createPlaylistButton} onClick={() => setShowCreate((v) => !v)}>
          +
        </button>
      </div>

      {showCreate && (
        <div className={styles.createForm}>
          <input
            className={styles.input}
            placeholder="Nome da playlist"
            value={creatingName}
            onChange={(e) => setCreatingName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <button className={styles.confirmButton} onClick={handleCreate}>
            criar
          </button>
        </div>
      )}

      <div className={styles.playlistsList}>
        {playlists.length === 0 && (
          <p className={styles.empty}>Nenhuma playlist ainda.</p>
        )}
        {playlists.map((pl) => (
          <div key={pl.id} className={styles.playlistItem}>
            <img src={randomCover(pl.name)} alt={pl.name} onClick={() => handleOpenPlaylist(pl)} />

            {renamingId === pl.id ? (
              <input
                className={styles.input}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(pl.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                autoFocus
              />
            ) : (
              <h3 onClick={() => handleOpenPlaylist(pl)}>{pl.name}</h3>
            )}

            <div className={styles.playlistActions}>
              {renamingId === pl.id ? (
                <>
                  <button className={styles.actionButton} onClick={() => handleRename(pl.id)}>✓</button>
                  <button className={styles.actionButton} onClick={() => setRenamingId(null)}>✕</button>
                </>
              ) : (
                <>
                  <button className={styles.actionButton} onClick={() => { setRenamingId(pl.id); setRenameValue(pl.name); }} title="Renomear">✎</button>
                  <button className={styles.actionButton} onClick={() => handleRemove(pl.id)} title="Deletar">🗑</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SongRow({ song, inPlaylist, onPlay, onToggle }) {
  return (
    <div className={`${styles.songItem} ${inPlaylist ? styles.inPlaylist : ""}`}>
      <img
        src={randomCover(song.title)}
        alt={song.title}
        className={styles.songCover}
        onClick={onPlay}
      />
      <div className={styles.songInfo} onClick={onPlay}>
        <span className={styles.songTitle}>{song.title}</span>
        <span className={styles.songArtist}>{song.artist}</span>
      </div>
      <button
        className={`${styles.toggleButton} ${inPlaylist ? styles.toggleRemove : styles.toggleAdd}`}
        onClick={onToggle}
        title={inPlaylist ? "Remover da playlist" : "Adicionar à playlist"}
      >
        {inPlaylist ? "−" : "+"}
      </button>
    </div>
  );
}