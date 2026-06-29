import { useState, useEffect } from "react";
import styles from "./style.module.css";
import { usePlayerStore } from "../../store/playerStore";
import { MdOutlinePlaylistAdd, MdEditNote } from "react-icons/md";
import { FaTrashAlt, FaPlay } from "react-icons/fa";
import { MdAdd, MdRemove } from "react-icons/md";
import { Header } from "../../components/Header";

/* ===== Componentes auxiliares ===== */

function MusicCard({ song, inPlaylist, onPlay, onToggle }) {
  const initial = (song.title ?? "?")[0].toUpperCase();
  return (
    <div className={styles.musicCard} onClick={() => onPlay(song)}>
      <div className={styles.musicInitial}>{initial}</div>
      <div className={styles.musicInfo}>
        <span className={styles.musicTitle}>{song.title}</span>
        <span className={styles.musicArtist}>{song.artist}</span>
      </div>
      <button
        className={`${styles.toggleBtn} ${inPlaylist ? styles.removeBtn : styles.addBtn}`}
        onClick={(e) => { e.stopPropagation(); onToggle(song); }}
        title={inPlaylist ? "Remover da playlist" : "Adicionar à playlist"}
      >
        {inPlaylist ? <MdRemove /> : <MdAdd />}
      </button>
    </div>
  );
}

function SongRow({ song, onAdd }) {
  return (
    <div className={styles.songRow}>
      <div className={styles.songRowInfo}>
        <span className={styles.songRowTitle}>{song.title}</span>
        <span className={styles.songRowArtist}>{song.artist}</span>
      </div>
      <button className={styles.addBtn} onClick={() => onAdd(song)} title="Adicionar à playlist">
        <MdAdd />
      </button>
    </div>
  );
}

/* ===== Componente principal ===== */
export function PlaylistScreen({ setScreen }) {
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
    setScreen("player");
  }

  function handlePlaySong(song) {
    playSong(song, [song]);
    // opcional: navegar para o player
    // setScreen("player");
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

  // ---- VISÃO INTERNA DA PLAYLIST (layout 60/40) ----
  if (openPlaylist) {
    const filtered = allSongs.filter(
      (s) =>
        s.title?.toLowerCase().includes(search.toLowerCase()) ||
        s.artist?.toLowerCase().includes(search.toLowerCase())
    );
    const inPlaylist = filtered.filter((s) => playlistSongIds.has(s.id));
    const notInPlaylist = filtered.filter((s) => !playlistSongIds.has(s.id));

    return (
      <div className={styles.playlistScreen}>
        <Header title={openPlaylist.name} onBack={() => setOpenPlaylist(null)}>
          <button className={styles.playAllBtn} onClick={handlePlayAll} title="Tocar todas">
            <FaPlay size={12} />
          </button>
        </Header>

        <div className={styles.searchBar}>
          <input
            className={styles.input}
            placeholder="Buscar música por título ou artista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.splitLayout}>
          {/* Painel esquerdo: músicas NA playlist */}
          <section className={styles.leftPanel}>
            <h3 className={styles.sectionTitle}>Na playlist ({inPlaylist.length})</h3>
            {inPlaylist.length === 0 ? (
              <p className={styles.empty}>Nenhuma música na playlist.</p>
            ) : (
              <div className={styles.musicGrid}>
                {inPlaylist.map((song) => (
                  <MusicCard
                    key={song.id}
                    song={song}
                    inPlaylist
                    onPlay={handlePlaySong}
                    onToggle={handleToggleSong}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Painel direito: músicas FORA da playlist */}
          <section className={styles.rightPanel}>
            <h3 className={styles.sectionTitle}>Biblioteca ({notInPlaylist.length})</h3>
            {notInPlaylist.length === 0 ? (
              <p className={styles.empty}>Todas as músicas já estão na playlist.</p>
            ) : (
              <div className={styles.songList}>
                {notInPlaylist.map((song) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    onAdd={handleToggleSong}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // ---- VISÃO LISTA DE PLAYLISTS (cards) ----
  return (
    <div className={styles.playlistScreen}>
      <Header title="Playlists" onBack={() => setScreen("player")}>
        <button
          className={styles.createPlaylistBtn}
          onClick={() => setShowCreate((v) => !v)}
        >
          <MdOutlinePlaylistAdd size={20} />
          <span>Criar Playlist</span>
        </button>
      </Header>

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
          <button className={styles.confirmBtn} onClick={handleCreate}>
            Criar
          </button>
        </div>
      )}

      <div className={styles.playlistsGrid}>
        {playlists.length === 0 ? (
          <p className={styles.empty}>Nenhuma playlist ainda.</p>
        ) : (
          playlists.map((pl) => (
            <div
              key={pl.id}
              className={styles.playlistCard}
              onClick={() => handleOpenPlaylist(pl)}
            >
              <div className={styles.playlistInitial}>
                {(pl.name ?? "P")[0].toUpperCase()}
              </div>

              {renamingId === pl.id ? (
                <input
                  className={styles.renameInput}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(pl.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h3 className={styles.playlistName}>{pl.name}</h3>
              )}

              <div className={styles.playlistActions}>
                {renamingId === pl.id ? (
                  <>
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => { e.stopPropagation(); handleRename(pl.id); }}
                    >
                      ✓
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => { e.stopPropagation(); setRenamingId(null); }}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(pl.id);
                        setRenameValue(pl.name);
                      }}
                      title="Renomear"
                    >
                      <MdEditNote size={16} />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.dangerBtn}`}
                      onClick={(e) => { e.stopPropagation(); handleRemove(pl.id); }}
                      title="Deletar"
                    >
                      <FaTrashAlt size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}