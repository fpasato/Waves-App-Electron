import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./style.module.css";

const AUDIO_EXTS = [".mp3", ".m4a", ".opus"];

function isAudioFile(name = "") {
  return AUDIO_EXTS.some((e) => name.toLowerCase().endsWith(e));
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, value = bytes;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(1)} ${units[i]}`;
}

function formatDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Active download toast ────────────────────────────────────────────────────

function ActiveDownloads({ downloads }) {
  if (downloads.length === 0) return null;
  return (
    <div className={styles.activeDownloads}>
      {downloads.map((d) => (
        <div key={d.id} className={styles.activeCard}>
          <div className={styles.activeHeader}>
            <span className={styles.activeIcon}>{d.type === "audio" ? "🎵" : "🎬"}</span>
            <span className={styles.activeTitle}>{d.title}</span>
            <span className={styles.activePct}>{d.percent}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              style={{ width: `${d.percent}%` }}
              data-type={d.type}
            />
          </div>
          {d.speed || d.eta ? (
            <div className={styles.activeInfo}>
              {d.speed && <span>{d.speed}</span>}
              {d.eta  && <span>ETA {d.eta}</span>}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ─── File card ────────────────────────────────────────────────────────────────

function EmptyState({ filter }) {
  const icon = filter === "audio" ? "🎵" : filter === "video" ? "🎬" : "📂";
  const sub =
    filter === "all"
      ? "Seus downloads do YouTube aparecerão aqui."
      : `Nenhum ${filter === "audio" ? "áudio" : "vídeo"} baixado ainda.`;
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon}>{icon}</span>
      <p className={styles.emptyTitle}>Nenhum download encontrado</p>
      <p className={styles.emptySubtitle}>{sub}</p>
    </div>
  );
}

function FileCard({ file, onOpen, onReveal, onDelete }) {
  const audio = isAudioFile(file.name);
  return (
    <div className={styles.fileCard}>
      <div className={styles.fileIcon} data-type={audio ? "audio" : "video"}>
        {audio ? "🎵" : "🎬"}
      </div>
      <div className={styles.fileMeta}>
        <p className={styles.fileName} title={file.name}>{file.name}</p>
        <p className={styles.fileInfo}>
          {formatDate(file.modifiedAt)} · {formatBytes(file.size)}
        </p>
      </div>
      <div className={styles.fileActions}>
        <button className={styles.actionBtn} title="Abrir"              onClick={() => onOpen(file.path)}>▶</button>
        <button className={styles.actionBtn} title="Mostrar no Explorer" onClick={() => onReveal(file.path)}>📁</button>
        <button className={`${styles.actionBtn} ${styles.deleteBtn}`}  title="Excluir" onClick={() => onDelete(file)}>🗑</button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DownloadScreen({ setScreen }) {
  const [files, setFiles]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState("all");
  const [search, setSearch]               = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  // { id, title, type, percent, speed, eta }
  const [activeDownloads, setActiveDownloads] = useState([]);
  const listenersRef = useRef(false);

  // ── Escuta eventos de progresso do main process ──
  useEffect(() => {
    if (listenersRef.current) return;
    listenersRef.current = true;

    const onProgress = (_, { id, title, type, percent, speed, eta }) => {
      setActiveDownloads((prev) => {
        const exists = prev.find((d) => d.id === id);
        if (exists) {
          return prev.map((d) => d.id === id ? { ...d, percent, speed, eta } : d);
        }
        return [...prev, { id, title, type, percent: percent ?? 0, speed, eta }];
      });
    };

    const onDone = (_, { id }) => {
      setActiveDownloads((prev) => prev.filter((d) => d.id !== id));
      // Recarrega a lista quando um download termina
      loadFiles();
    };

    const onError = (_, { id }) => {
      setActiveDownloads((prev) => prev.filter((d) => d.id !== id));
    };

    window.electronAPI.downloads.onProgress(onProgress);
    window.electronAPI.downloads.onDone(onError);
    window.electronAPI.downloads.onError(onError);

    return () => {
      window.electronAPI.downloads.removeListeners?.();
      listenersRef.current = false;
    };
  }, []);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.downloads.listFiles();
      setFiles(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("downloads:listFiles erro:", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleOpen   = (p) => window.electronAPI.downloads.openFile(p).catch(console.error);
  const handleReveal = (p) => window.electronAPI.downloads.revealFile(p).catch(console.error);

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await window.electronAPI.downloads.deleteFile(confirmDelete.path);
      setFiles((prev) => prev.filter((f) => f.path !== confirmDelete.path));
    } catch (err) {
      console.error("deleteFile erro:", err);
    } finally {
      setConfirmDelete(null);
    }
  }, [confirmDelete]);

  const filtered = files
    .filter((f) => {
      const type = isAudioFile(f.name) ? "audio" : "video";
      if (filter !== "all" && filter !== type) return false;
      if (search.trim() && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0));

  const totalVideo = files.filter((f) => !isAudioFile(f.name)).length;
  const totalAudio = files.filter((f) =>  isAudioFile(f.name)).length;

  return (
    <div className={styles.wrap}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Downloads</h1>
          <button className={styles.refreshBtn} onClick={loadFiles} title="Atualizar">↻</button>
          <button onClick={() => setScreen("player")}>voltar</button>
        </div>

        <div className={styles.statsRow}>
          <span className={styles.chip}>🎬 {totalVideo} vídeo{totalVideo !== 1 ? "s" : ""}</span>
          <span className={styles.chip}>🎵 {totalAudio} áudio{totalAudio !== 1 ? "s" : ""}</span>
        </div>

        <input
          className={styles.search}
          type="text"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.tabs}>
          {[["all","Todos"],["video","🎬 Vídeos"],["audio","🎵 Áudios"]].map(([k, l]) => (
            <button
              key={k}
              className={`${styles.tab} ${filter === k ? styles.tabActive : ""}`}
              onClick={() => setFilter(k)}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* ── Downloads ativos ── */}
      <ActiveDownloads downloads={activeDownloads} />

      {/* ── Lista de arquivos ── */}
      <div className={styles.list}>
        {loading ? (
          <div className={styles.center}>
            <div className={styles.spinner} />
            <p>Carregando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          filtered.map((file) => (
            <FileCard
              key={file.path}
              file={file}
              onOpen={handleOpen}
              onReveal={handleReveal}
              onDelete={setConfirmDelete}
            />
          ))
        )}
      </div>

      {/* ── Modal confirmação ── */}
      {confirmDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTitle}>Excluir arquivo?</p>
            <p className={styles.modalFile}>{confirmDelete.name}</p>
            <p className={styles.modalWarn}>Essa ação não pode ser desfeita.</p>
            <div className={styles.modalBtns}>
              <button className={styles.btnCancel} onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className={styles.btnDelete} onClick={handleDeleteConfirm}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}