import { useState, useEffect, useRef, useCallback } from "react";

export function useDownloadQueue() {
  const [activeDownloads, setActiveDownloads] = useState([]);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    window.electronAPI.downloads.onQueued((_, { id, title, type }) => {
      setActiveDownloads((prev) => {
        if (prev.find((d) => d.id === id)) return prev;
        return [...prev, { id, title, type, percent: 0, status: "pending" }];
      });
    });

    window.electronAPI.downloads.onProgress((_, { id, title, type, percent, speed, eta }) => {
      setActiveDownloads((prev) => {
        const exists = prev.find((d) => d.id === id);
        if (exists) {
          return prev.map((d) =>
            d.id === id ? { ...d, percent, speed, eta, status: "downloading" } : d
          );
        }
        return [...prev, { id, title, type, percent: percent ?? 0, speed, eta, status: "downloading" }];
      });
    });

    window.electronAPI.downloads.onDone((_, { id }) => {
      setActiveDownloads((prev) =>
        prev.map((d) => d.id === id ? { ...d, percent: 100, status: "done" } : d)
      );
    });

    window.electronAPI.downloads.onError((_, { id, error }) => {
      setActiveDownloads((prev) =>
        prev.map((d) => d.id === id ? { ...d, status: "error", error } : d)
      );
    });

    window.electronAPI.downloads.onCancelled((_, { id }) => {
      setActiveDownloads((prev) => prev.filter((d) => d.id !== id));
    });

    // SEM return de cleanup — listeners ficam vivos para sempre (correto para app Electron)
  }, []);

  const cancelDownload = useCallback((id) => {
    setActiveDownloads((prev) => {
      const item = prev.find((d) => d.id === id);
      if (!item) return prev;
      window.electronAPI.downloads.cancelDownload(id);
      // remove imediatamente da lista, independente do status
      return prev.filter((d) => d.id !== id);
    });
  }, []);

  const dismissDownload = useCallback((id) => {
    setActiveDownloads((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setActiveDownloads((prev) =>
      prev.filter((d) => d.status === "downloading" || d.status === "pending")
    );
  }, []);

  const queueCount = activeDownloads.filter(
    (d) => d.status === "downloading" || d.status === "pending"
  ).length;

  return {
    activeDownloads,
    setActiveDownloads,
    queueCount,
    dismissDownload,
    clearFinished,
    cancelDownload,
  };
}