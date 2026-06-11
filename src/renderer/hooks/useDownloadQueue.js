import { useState, useEffect, useRef, useCallback } from "react";

export function useDownloadQueue() {
  const [activeDownloads, setActiveDownloads] = useState([]);
  const listenersRef = useRef(false);

  useEffect(() => {
    if (listenersRef.current) return;
    listenersRef.current = true;

    const onQueued = (_, { id, title, type }) => {
      setActiveDownloads((prev) => {
        if (prev.find((d) => d.id === id)) return prev;
        return [...prev, { id, title, type, percent: 0, status: "pending" }];
      });
    };

    const onProgress = (_, { id, title, type, percent, speed, eta }) => {
      setActiveDownloads((prev) => {
        const exists = prev.find((d) => d.id === id);
        if (exists) {
          return prev.map((d) =>
            d.id === id ? { ...d, percent, speed, eta, status: "downloading" } : d
          );
        }
        return [...prev, { id, title, type, percent: percent ?? 0, speed, eta, status: "downloading" }];
      });
    };

    const onDone = (_, { id }) => {
      setActiveDownloads((prev) =>
        prev.map((d) => d.id === id ? { ...d, percent: 100, status: "done" } : d)
      );
    };

    const onError = (_, { id, error }) => {
      setActiveDownloads((prev) =>
        prev.map((d) => d.id === id ? { ...d, status: "error", error } : d)
      );
    };

    window.electronAPI.downloads.onQueued(onQueued);
    window.electronAPI.downloads.onProgress(onProgress);
    window.electronAPI.downloads.onDone(onDone);
    window.electronAPI.downloads.onError(onError);

    return () => {
      window.electronAPI.downloads.removeListeners?.();
      listenersRef.current = false;
    };
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

  return { activeDownloads, setActiveDownloads, queueCount, dismissDownload, clearFinished };
}