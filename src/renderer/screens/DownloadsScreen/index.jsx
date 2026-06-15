import { useCallback, useEffect, useState } from "react";
import { useDownloads } from "../../hooks/useDownloads";
import styles from "./style.module.css";

import { GiExitDoor, GiClapperboard } from "react-icons/gi";
import {
  FaMusic,
  FaTrashAlt,
  FaFolder,
  FaPlay,
  FaDownload,
  FaCheck,
  FaTimes,
  FaHourglassHalf,
  FaCheckSquare,
} from "react-icons/fa";
import { FaMicrophoneAlt } from "react-icons/fa";
import { IoReload } from "react-icons/io5";

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

function QueueItem({ item, onDismiss, onCancel }) {
  const isPending = item.status === "pending";
  const isActive = item.status === "downloading";
  const isDone = item.status === "done";
  const isError = item.status === "error";

  return (
    <div
      className={`${styles.queueItem} ${styles[`queueItem_${item.status}`]}`}
    >
      <div
        className={styles.queueIcon}
        data-type={item.type === "video" ? "video" : "audio"}
      >
        {item.type === "video" ? <GiClapperboard /> : <FaMusic />}
      </div>

      <div className={styles.queueInfo}>
        <p className={styles.queueTitle}>{item.title}</p>
        {isPending && (
          <p className={styles.queueStatus_pending}>
            <FaHourglassHalf style={{ marginRight: 4 }} />
            Na fila...
          </p>
        )}
        {isActive && (
          <>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${item.percent ?? 0}%` }}
              />
            </div>
            <div className={styles.progressMeta}>
              <span>{item.percent ?? 0}%</span>
              {item.speed && <span>{item.speed}</span>}
              {item.eta && <span>ETA {item.eta}</span>}
            </div>
          </>
        )}
        {isDone && <p className={styles.queueStatus_done}>Concluído</p>}
        {isError && (
          <p className={styles.queueStatus_error}>
            Erro: {item.error ?? "falha no download"}
          </p>
        )}
      </div>

      {(isDone || isError) && (
        <button
          className={styles.queueDismiss}
          onClick={() => onDismiss(item.id)}
          title="Remover da fila"
        >
          <FaTimes />
        </button>
      )}
      {(isActive || isPending) && (
        <button
          className={styles.queueDismiss}
          onClick={() => onCancel(item.id)}
          title="Cancelar download"
        >
          <FaTimes />
        </button>
      )}
      {isDone && <FaCheck className={styles.queueBadgeDone} />}
    </div>
  );
}

function FileCard({
  file,
  selected,
  onToggle,
  onOpen,
  onReveal,
  onDelete,
  selectMode,
}) {
  const isAudioLike = file.type === "audio" || file.type === "radio";
  return (
    <div
      className={`${styles.fileCard} ${selected ? styles.fileCardSelected : ""}`}
      onClick={selectMode ? onToggle : undefined}
    >
      {selectMode && (
        <input
          type="checkbox"
          className={styles.fileCheckbox}
          checked={selected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
        />
      )}
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
      <div className={styles.fileActions} onClick={(e) => e.stopPropagation()}>
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

function EmptyState({ filter }) {
  return (
    <div className={styles.center}>
      <p style={{ opacity: 0.4 }}>
        {filter === "all"
          ? "Nenhum arquivo baixado ainda."
          : `Nenhum arquivo do tipo "${filter}".`}
      </p>
    </div>
  );
}

const FILTER_TABS = [
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
];

export function DownloadScreen({ setScreen, downloadQueue }) {
  const {
    activeDownloads,
    dismissDownload,
    clearFinished,
    queueCount,
    cancelDownload,
  } = downloadQueue;
  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const {
    loading,
    filter,
    setFilter,
    search,
    setSearch,
    confirmDelete,
    setConfirmDelete,
    confirmDeleteMulti,
    setConfirmDeleteMulti,
    activeTab,
    setActiveTab,
    loadFiles,
    handleDeleteConfirm,
    handleDeleteMultiple,
    filtered,
    totalVideo,
    totalAudio,
    totalRadio,
  } = useDownloads({
    activeDownloads,
    dismissDownload,
    clearFinished,
    queueCount,
  });

  useEffect(() => {
    const hasDone = activeDownloads.some((d) => d.status === "done");
    if (hasDone) loadFiles();
  }, [activeDownloads]);

  useEffect(() => {
    setSelected(new Set());
    setSelectMode(false);
  }, [filter, activeTab]);

  const toggleSelect = (path) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  const toggleSelectAll = () =>
    setSelected(
      selected.size === filtered.length
        ? new Set()
        : new Set(filtered.map((f) => f.path)),
    );

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const handleOpen = useCallback(
    (file) => {
      if (file.type === "audio" || file.type === "radio") {
        setScreen("player", {
          song: {
            id: file.path,
            title: file.name,
            path: file.path,
            src: `file://${file.path}`,
          },
        });
      } else {
        window.electronAPI.downloads.openFile(file.path).catch(console.error);
      }
    },
    [setScreen],
  );

  const handleReveal = (p) =>
    window.electronAPI.downloads.revealFile(p).catch(console.error);

  const finishedCount = activeDownloads.filter(
    (d) => d.status === "done" || d.status === "error",
  ).length;

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

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
            <GiClapperboard /> {totalVideo} vídeo{totalVideo !== 1 ? "s" : ""}
          </span>
          <span className={styles.chip}>
            <FaMusic /> {totalAudio} áudio{totalAudio !== 1 ? "s" : ""}
          </span>
          <span className={styles.chip}>
            <FaMicrophoneAlt /> {totalRadio} gravação
            {totalRadio !== 1 ? "s" : ""}
          </span>
        </div>

        <div className={styles.mainTabs}>
          {["files", "queue"].map((tab) => (
            <button
              key={tab}
              className={`${styles.mainTab} ${activeTab === tab ? styles.mainTabActive : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "files" ? "Arquivos" : "Fila"}
              {tab === "queue" && queueCount > 0 && (
                <span className={styles.queueBadge}>{queueCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Aba: Arquivos ── */}
      {activeTab === "files" && (
        <>
          <div className={styles.fileControls}>
            <input
              className={styles.search}
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className={styles.tabs}>
              {FILTER_TABS.map(([k, label]) => (
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

          <div className={styles.list}>
            {loading ? (
              <div className={styles.center}>
                <div className={styles.spinner} />
                <p>Carregando...</p>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState filter={filter} />
            ) : (
              <>
                <div className={styles.selectionBar}>
                  {!selectMode ? (
                    <button
                      className={styles.selectModeBtn}
                      onClick={() => setSelectMode(true)}
                    >
                      <FaCheckSquare /> Selecionar
                    </button>
                  ) : (
                    <>
                      <label className={styles.selectAllLabel}>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                        />
                        {selected.size > 0
                          ? `${selected.size} selecionado${selected.size > 1 ? "s" : ""}`
                          : "Selecionar todos"}
                      </label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {selected.size > 0 && (
                          <button
                            className={styles.deleteSelectedBtn}
                            onClick={() => setConfirmDeleteMulti(true)}
                          >
                            <FaTrashAlt /> Excluir {selected.size}
                          </button>
                        )}
                        <button
                          className={styles.cancelSelectBtn}
                          onClick={exitSelectMode}
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {filtered.map((file) => (
                  <FileCard
                    key={file.path}
                    file={file}
                    selectMode={selectMode}
                    selected={selected.has(file.path)}
                    onToggle={() => toggleSelect(file.path)}
                    onOpen={() => handleOpen(file)}
                    onReveal={handleReveal}
                    onDelete={setConfirmDelete}
                  />
                ))}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Aba: Fila ── */}
      {activeTab === "queue" && (
        <div className={styles.queueTab}>
          {activeDownloads.length === 0 ? (
            <div className={styles.center}>
              <FaDownload style={{ fontSize: "2rem", opacity: 0.2 }} />
              <p style={{ opacity: 0.4, marginTop: 12 }}>
                Nenhum download em andamento.
              </p>
            </div>
          ) : (
            <>
              {finishedCount > 0 && (
                <div className={styles.queueHeader}>
                  <span className={styles.queueHeaderCount}>
                    {activeDownloads.length} item
                    {activeDownloads.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    className={styles.clearFinishedBtn}
                    onClick={clearFinished}
                  >
                    Limpar concluídos
                  </button>
                </div>
              )}
              <div className={styles.queueList}>
                {activeDownloads.map((item) => (
                  <QueueItem
                    key={item.id}
                    item={item}
                    onDismiss={dismissDownload}
                    onCancel={cancelDownload} 
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Modal: exclusão única ── */}
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

      {/* ── Modal: exclusão múltipla ── */}
      {confirmDeleteMulti && (
        <div
          className={styles.overlay}
          onClick={() => setConfirmDeleteMulti(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTitle}>
              Excluir {selected.size} arquivo{selected.size > 1 ? "s" : ""}?
            </p>
            <p className={styles.modalWarn}>Essa ação não pode ser desfeita.</p>
            <div className={styles.modalBtns}>
              <button
                className={styles.btnCancel}
                onClick={() => setConfirmDeleteMulti(false)}
              >
                Cancelar
              </button>
              <button
                className={styles.btnDelete}
                onClick={() => {
                  handleDeleteMultiple([...selected]);
                  setSelected(new Set());
                }}
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
