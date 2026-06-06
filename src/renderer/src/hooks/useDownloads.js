// hooks/useDownloads.js
import { useState, useEffect, useCallback, useRef } from "react";
export function useDownloads({
  activeDownloads,
  dismissDownload,
  clearFinished,
  queueCount,
  onFilesChanged,
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeTab, setActiveTab] = useState("files");
  const [confirmDeleteMulti, setConfirmDeleteMulti] = useState(false);

  const handleDeleteMultiple = useCallback(async (paths) => {
    try {
      await Promise.all(
        paths.map((p) => window.electronAPI.downloads.deleteFile(p)),
      );
      setFiles((prev) => prev.filter((f) => !paths.includes(f.path)));
    } catch (err) {
      console.error("deleteMultiple erro:", err);
    } finally {
      setConfirmDeleteMulti(false);
    }
  }, []);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.downloads.listFiles();
      setFiles(Array.isArray(result) ? result : []);
    } catch (err) {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // ── sem useEffect de listeners aqui ──

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
      if (filter === "all") return true;
      return f.type === filter;
    })
    .filter((f) =>
      search.trim()
        ? f.name.toLowerCase().includes(search.toLowerCase())
        : true,
    )
    .sort((a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0));

  return {
    files,
    loading,
    filter,
    setFilter,
    search,
    setSearch,
    confirmDelete,
    setConfirmDelete,
    activeDownloads,
    activeTab,
    setActiveTab,
    queueCount,
    dismissDownload,
    clearFinished,
    loadFiles,
    handleDeleteConfirm,
    confirmDeleteMulti,
    setConfirmDeleteMulti,
    handleDeleteMultiple,
    filtered,
    totalVideo: files.filter((f) => f.type === "video").length,
    totalAudio: files.filter((f) => f.type === "audio").length,
    totalRadio: files.filter((f) => f.type === "radio").length,
  };
}
