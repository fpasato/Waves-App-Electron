import { useState } from "react";
import { usePlayerStore } from "../store/playerStore";

export function useYoutubeActions() {
  const [loadingId, setLoadingId] = useState(null);
  const playSong = usePlayerStore((state) => state.playSong);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const [downloading, setDownloading] = useState(null);

  const handlePlayAudio = async (item) => {
    setLoadingId(item.id);
    try {
      const audioUrl = await window.api.youtube.getAudioUrl(item.id);
      const song = {
        id: item.id,
        title: item.title,
        artist: item.channel,
        src: audioUrl,
        duration: item.duration,
        thumbnail: item.thumbnail,
        type: "audio",
      };
      playSong(song, [song]);
      return true;
    } catch (err) {
      alert("Erro ao reproduzir áudio.");
      return false;
    } finally {
      setLoadingId(null);
    }
  };

  const handleAddToQueue = async (item) => {
    setLoadingId(item.id);
    try {
      const audioUrl = await window.api.youtube.getAudioUrl(item.id);
      addToQueue({
        id: item.id,
        title: item.title,
        artist: item.channel,
        src: audioUrl,
        duration: item.duration,
        thumbnail: item.thumbnail,
        type: "audio",
      });
    } catch (err) {
      alert("Erro ao adicionar à fila.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDownloadAudio = async (item) => {
    setLoadingId(item.id);
    setDownloading({ id: item.id, title: item.title, type: "audio" });
    try {
      const result = await window.api.youtube.download({
        videoId: item.id,
        title: item.title,
      });
      if (!result.success) throw new Error(result.error);
      alert(`✅ Download concluído: ${item.title}`);
    } catch (err) {
      alert("Erro ao baixar música.");
    } finally {
      setLoadingId(null);
      setDownloading(null);
    }
  };

  const getVideoFormats = async (videoId) => {
    try {
      return await window.api.youtube.getVideoFormats(videoId);
    } catch (err) {
      alert("Erro ao carregar qualidades de vídeo.");
      return [];
    }
  };

  const playVideo = async (item, formatId) => {
    setLoadingId(item.id);
    try {
      const videoUrl = await window.api.youtube.getVideoUrl(
        item.id,
        formatId || "bestvideo[ext=mp4]+bestaudio/best", // 👈 fallback
      );
      const song = {
        id: item.id,
        title: item.title,
        artist: item.channel,
        src: videoUrl,
        duration: item.duration,
        thumbnail: item.thumbnail,
        type: "video",
        formatId,
      };
      playSong(song, [song]);
    } catch (err) {
      alert("Erro ao reproduzir vídeo.");
    } finally {
      setLoadingId(null);
    }
  };

  const downloadVideo = async (item, formatId) => {
    setLoadingId(item.id);
    setDownloading({ id: item.id, title: item.title, type: "video" });
    try {
      const result = await window.api.youtube.downloadVideo({
        videoId: item.id,
        title: item.title,
        formatId,
      });
      if (!result.success) throw new Error(result.error);
      alert(`✅ Vídeo salvo em: ${result.path}`);
    } catch (err) {
      alert("Erro ao baixar vídeo.");
    } finally {
      setLoadingId(null);
      setDownloading(null);
    }
  };
  
  return {
    loadingId,
    downloading, 
    handlePlayAudio,
    handleAddToQueue,
    handleDownloadAudio,
    getVideoFormats,
    playVideo,
    downloadVideo,
  };
}
