import { useState, useEffect } from "react";
import { usePlayerStore } from "../../store/playerStore";
import { useDirectories } from "../../hooks/useDatabase";
import { mapTracksForDb } from "../../lib/syncLibrary";
import { useSongs } from "../../hooks/useDatabase";
import { Button } from "../../components/Button";

import styles from "./style.module.css";

export function DirectoriesSettings() {
  const { reloadLibraryFromDatabase } = usePlayerStore();
  const { addDirectory, removeDirectory, listDirectories } = useDirectories();
  const { upsertManySongs } = useSongs();

  const [directories, setDirectories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  // Carrega os diretórios do banco de dados
  useEffect(() => {
    (async () => {
      try {
        const dirs = await listDirectories();
        setDirectories(dirs);
      } catch {
        setStatus("❌ Erro ao carregar diretórios");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Adiciona uma nova pasta
  async function handleAddFolder() {
    const folder = await window.musicAPI.selectFolder();
    if (!folder) return;

    if (directories.some((d) => d.path === folder)) {
      setStatus("⚠️ Pasta já adicionada");
      return;
    }

    setStatus("Escaneando...");

    try {
      const savedDir = await addDirectory(folder);
      const tracks = await window.musicAPI.scanFolder(folder);

      if (tracks.length > 0) {
        await upsertManySongs(mapTracksForDb(tracks, savedDir.id));
      }

      await reloadLibraryFromDatabase();
      setDirectories((prev) => [...prev, savedDir]);
      setStatus(`${tracks.length} músicas encontradas`);
    } catch (err) {
      console.error(err);
      setStatus("Erro ao adicionar pasta");
    }
  }

  // Escaneia uma pasta
  async function handleScanFolder(dir) {
    setStatus("Escaneando pasta...");

    try {
      const tracks = await window.musicAPI.scanFolder(dir.path);

      if (tracks.length > 0) {
        await upsertManySongs(mapTracksForDb(tracks, dir.id));
      }

      await reloadLibraryFromDatabase();

      setStatus(`${tracks.length} músicas encontradas na pasta Escaneada`);
    } catch (err) {
      console.error(err);
      setStatus("Erro ao escanear pasta");
    }
  }

  // Remove uma pasta
  async function handleRemoveFolder(dir) {
    try {
      await removeDirectory(dir.id);
      await reloadLibraryFromDatabase();
      setDirectories((prev) => prev.filter((d) => d.id !== dir.id));
      setStatus("Pasta removida com sucesso");
    } catch (err) {
      console.error(err);
      setStatus("Erro ao remover pasta");
    }
  }

  return (
    <div className={styles.DirectoriesContainer}>
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h2>Diretórios de Música</h2>
          <p>
            Explore e adicione pastas contendo músicas para compor sua
            biblioteca.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button title="+ Adicionar pasta" onClick={handleAddFolder} />
        </div>
      </div>
      <span className={styles.warning}>
        Caso uma pasta seja renomeada ou movida, será necessário removê-la e adicioná-la novamente para atualizar a biblioteca.
      </span>

      {status && <p className={styles.status}>{status}</p>}

      <ul className={styles.list}>
        {loading ? (
          <p className={styles.empty}>Carregando...</p>
        ) : directories.length === 0 ? (
          <p className={styles.empty}>Nenhuma pasta adicionada.</p>
        ) : (
          directories.map((dir) => (
            <li key={dir.id} className={styles.dirItem}>
              <span>{dir.path}</span>

              <div className={styles.dirActions}>
                <Button
                  onClick={() => handleScanFolder(dir)}
                  title="Escanear"
                />
                <Button
                  onClick={() => handleRemoveFolder(dir)}
                  title="Remover"
                />
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
