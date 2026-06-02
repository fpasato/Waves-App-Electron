// components/DownloadScreen/index.jsx
import { useCallback } from "react";
import { useDownloads } from "../../hooks/useDownloads";
import styles from "./style.module.css";

import { GiExitDoor } from "react-icons/gi";
import { FaMusic, FaTrashAlt, FaFolder, FaPlay } from "react-icons/fa";
import { GiClapperboard } from "react-icons/gi";
import { FaMicrophoneAlt } from "react-icons/fa";
import { IoReload } from "react-icons/io5";

// ─── funções utilitárias (mantidas aqui, não mudam) ────────────────────────
const AUDIO_EXTS = [".mp3", ".m4a", ".opus"];

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0,
    value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

function formatDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Subcomponentes ────────────────────────────────────────────────────────
function ActiveDownloads({ downloads }) {
  /* ... igual ao original ... */
}

function EmptyState({ filter }) {
  /* ... igual ... */
}

function FileCard({ file, onOpen, onReveal, onDelete }) {
  const isAudioLike = file.type === "audio" || file.type === "radio";
  return (
    <div className={styles.fileCard}>
      <div
        className={styles.fileIcon}
        data-type={isAudioLike ? "audio" : "video"}
      >
        {isAudioLike ? <FaMusic /> : <GiClapperboard />}
      </div>
      <div className={styles.fileMeta}>
        <p className={styles.fileName} title={file.name}>
          {file.name}
        </p>
        <p className={styles.fileInfo}>
          {formatDate(file.modifiedAt)} · {formatBytes(file.size)}
        </p>
      </div>
      <div className={styles.fileActions}>
        <button className={styles.actionBtn} title="Abrir" onClick={onOpen}>
          <FaPlay />
        </button>
        <button
          className={styles.actionBtn}
          title="Mostrar no Explorer"
          onClick={() => onReveal(file.path)}
        >
          <FaFolder />
        </button>
        <button
          className={`${styles.actionBtn} ${styles.deleteBtn}`}
          title="Excluir"
          onClick={() => onDelete(file)}
        >
          <FaTrashAlt />
        </button>
      </div>
    </div>
  );
}

export function DownloadScreen({ setScreen }) {
  const {
    loading,
    filter,
    setFilter,
    search,
    setSearch,
    confirmDelete,
    setConfirmDelete,
    activeDownloads,
    loadFiles,
    handleDeleteConfirm,
    filtered,
    totalVideo,
    totalAudio,
    totalRadio,
  } = useDownloads();

  const handleOpen = useCallback(
    (file) => {
      if (file.type === "audio" || file.type === "radio") {
        const song = {
          id: file.path,
          title: file.name,
          path: file.path,
          src: `file://${file.path}`,
        };
        setScreen("player", { song });
      } else {
        window.electronAPI.downloads.openFile(file.path).catch(console.error);
      }
    },
    [setScreen],
  );

  const handleReveal = (p) =>
    window.electronAPI.downloads.revealFile(p).catch(console.error);

  return (
    <div className={styles.wrap}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Downloads</h1>
          <div className={styles.actions}>
            <button
              className={styles.refreshBtn}
              onClick={loadFiles}
              title="Atualizar"
            >
              <IoReload />
            </button>
            <button
              onClick={() => setScreen("player")}
              className={styles.exitBtn}
            >
              <GiExitDoor />
            </button>
          </div>
        </div>

        <div className={styles.statsRow}>
          <span className={styles.chip}>
            {<GiClapperboard />} {totalVideo} vídeo{totalVideo !== 1 ? "s" : ""}
          </span>
          <span className={styles.chip}>
            {<FaMusic />} {totalAudio} áudio{totalAudio !== 1 ? "s" : ""}
          </span>
          <span className={styles.chip}>
            {<FaMicrophoneAlt />} {totalRadio} gravação
            {totalRadio !== 1 ? "s" : ""}
          </span>
        </div>

        <input
          className={styles.search}
          type="text"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.tabs}>
          {[
            [
              "all",
              <>
                <GiClapperboard /> Todos
              </>,
            ],
            [
              "video",
              <>
                <GiClapperboard /> Vídeos
              </>,
            ],
            [
              "audio",
              <>
                <FaMusic /> Áudios
              </>,
            ],
            [
              "radio",
              <>
                <FaMicrophoneAlt /> Gravações
              </>,
            ],
          ].map(([k, label]) => (
            <button
              key={k}
              className={`${styles.tab} ${filter === k ? styles.tabActive : ""}`}
              onClick={() => setFilter(k)}
            >
              {label}
            </button>
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
              onOpen={() => handleOpen(file)}
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
              <button
                className={styles.btnCancel}
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </button>
              <button
                className={styles.btnDelete}
                onClick={handleDeleteConfirm}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
