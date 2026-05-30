// hooks/useDownloads.js
import { useState, useEffect, useCallback, useRef } from "react";

export function useDownloads() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all" | "video" | "audio"
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeDownloads, setActiveDownloads] = useState([]);
  const listenersRef = useRef(false);

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

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Escuta eventos de progresso dos downloads
  useEffect(() => {
    if (listenersRef.current) return;
    listenersRef.current = true;

    const onProgress = (_, { id, title, type, percent, speed, eta }) => {
      setActiveDownloads((prev) => {
        const exists = prev.find((d) => d.id === id);
        if (exists) {
          return prev.map((d) =>
            d.id === id ? { ...d, percent, speed, eta } : d,
          );
        }
        return [
          ...prev,
          { id, title, type, percent: percent ?? 0, speed, eta },
        ];
      });
    };

    const onDone = (_, { id }) => {
      setActiveDownloads((prev) => prev.filter((d) => d.id !== id));
      loadFiles(); // recarrega a lista
    };

    const onError = (_, { id }) => {
      setActiveDownloads((prev) => prev.filter((d) => d.id !== id));
    };

    window.electronAPI.downloads.onProgress(onProgress);
    window.electronAPI.downloads.onDone(onDone); // ← corrigido (antes estava onError)
    window.electronAPI.downloads.onError(onError);

    return () => {
      window.electronAPI.downloads.removeListeners?.();
      listenersRef.current = false;
    };
  }, [loadFiles]);

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

  // Filtragem e ordenação
  const filtered = files
    .filter((f) => {
      const type = f.type; // "video" | "audio" | "radio"
      if (filter === "all") return true;
      if (filter === "video") return type === "video";
      if (filter === "audio") return type === "audio"; 
      if (filter === "radio") return type === "radio"; 
      return false;
    })
    .sort((a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0));

  const totalVideo = files.filter((f) => f.type === "video").length;
  const totalAudio = files.filter(
    (f) => f.type === "audio" || f.type === "radio",
  ).length;

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
    loadFiles,
    handleDeleteConfirm,
    filtered,
    totalVideo,
    totalAudio,
  };
}
