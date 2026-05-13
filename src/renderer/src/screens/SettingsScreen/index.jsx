import { useEffect, useState } from "react";
import { Header } from "../../Components/Header";
import styles from "./style.module.css";
import { usePlayerStore } from "../../store/playerStore";
import { useDirectories, useSongs } from "../../hooks/useDatabase";
import { mapTracksForDb } from "../../lib/syncLibrary";
import { PlaybackSettings } from "../../components/PlaybackSettings";

export function SettingsScreen({ setScreen }) {
  const { reloadLibraryFromDatabase } = usePlayerStore();

  const { addDirectory, removeDirectory, listDirectories } = useDirectories();
  const { upsertManySongs } = useSongs();

  const [tab, setTab] = useState("directories");
  const [directories, setDirectories] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

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

  async function handleAddFolder() {
    const folder = await window.musicAPI.selectFolder();
    if (!folder) return;

    if (directories.some((d) => d.path === folder)) {
      setStatus("⚠️ Pasta já adicionada");
      return;
    }

    setStatus("⏳ Escaneando...");

    try {
      const savedDir = await addDirectory(folder);
      const tracks = await window.musicAPI.scanFolder(folder);

      if (tracks.length > 0) {
        await upsertManySongs(mapTracksForDb(tracks, savedDir.id));
      }

      await reloadLibraryFromDatabase();
      setDirectories((prev) => [...prev, savedDir]);
      setStatus(`✅ ${tracks.length} músicas encontradas`);
    } catch (err) {
      console.error(err);
      setStatus("❌ Erro ao adicionar pasta");
    }
  }

  async function handleRemoveFolder(dir) {
    try {
      await removeDirectory(dir.id);
      await reloadLibraryFromDatabase();
      setDirectories((prev) => prev.filter((d) => d.id !== dir.id));
      setStatus("🗑️ Pasta removida");
    } catch (err) {
      console.error(err);
      setStatus("❌ Erro ao remover pasta");
    }
  }

  return (
    <div className={styles.settingsScreen}>
      <Header title="Configurações" />

      <div className={styles.container}>
        <nav className={styles.sidebar}>
          <button
            className={`${styles.tab} ${tab === "directories" ? styles.active : ""}`}
            onClick={() => setTab("directories")}
          >
            Diretórios
          </button>
          <button
            className={`${styles.tab} ${tab === "playback" ? styles.active : ""}`}
            onClick={() => setTab("playback")}
          >
            Playback
          </button>
          <button onClick={() => setScreen("player")}>Voltar</button>
        </nav>

        <div className={styles.content}>
          {tab === "directories" && (
            <div className={styles.section}>
              <h2>Diretórios de Música</h2>
              <p>
                As pastas ficam na base de dados; as músicas são gravadas na
                tabela <code>songs</code> com <code>directory_id</code>.
              </p>

              <button className={styles.addButton} onClick={handleAddFolder}>
                + Adicionar pasta
              </button>

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
                      <button onClick={() => handleRemoveFolder(dir)}>
                        Remover
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {tab === "playback" && <PlaybackSettings />}
        </div>
      </div>
    </div>
  );
}
