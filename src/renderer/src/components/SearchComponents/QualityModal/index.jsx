import { useState, useEffect } from "react";
import styles from "./style.module.css";

export function QualityModal({ item, onClose, actions }) {
  const [formats, setFormats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingFormats, setLoadingFormats] = useState(true);

  useEffect(() => {
    (async () => {
      const fmts = await window.api.youtube.getFormats(item.id);

      // Adiciona MP3 como opção fixa no topo
      const allFormats = [
        { id: "mp3", resolution: "MP3", ext: "mp3", isAudio: true },
        ...fmts,
      ];

      setFormats(allFormats);
      setSelected(allFormats[0]?.id);
      setLoadingFormats(false);
    })();
  }, [item.id]);

  const handleDownload = () => {
    const format = formats.find((f) => f.id === selected);
    if (format?.isAudio) {
      actions.handleDownloadAudio(item);
    } else {
      actions.downloadVideo(item, selected);
    }
    onClose();
  };

  const handleAddToQueue = () => {
    actions.handleAddToQueue(item);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <img src={item.thumbnail} alt={item.title} />
        <h3>{item.title}</h3>
        {loadingFormats ? (
          <p>Carregando qualidades...</p>
        ) : (
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {formats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.resolution} {f.isAudio ? "" : `(${f.ext})`}
              </option>
            ))}
          </select>
        )}
        <div className={styles.actions}>
          <button
            onClick={handleDownload}
            disabled={loadingFormats || !selected}
          >
            {loadingFormats ? "Carregando formatos..." : "⬇ Baixar"}
          </button>
          <button onClick={handleAddToQueue}>
            + Adicionar à fila do player
          </button>
        </div>
        <div className={styles.obs}>
          <div className={styles.pathItem}>
            <span className={styles.label}>Pasta de vídeos</span>
            <strong>Usuário/Vídeos/Vibe</strong>
          </div>
          <div className={styles.pathItem}>
            <span className={styles.label}>Pasta de músicas</span>
            <strong>Usuário/Música/Vibe</strong>
          </div>
        </div>
        {actions.downloading && (
          <p className={styles.downloadingMsg}>
            Baixando {actions.downloading.type === "audio" ? "MP3" : "vídeo"}
            ...
          </p>
        )}
        <button onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}
