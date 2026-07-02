import { useState } from "react";
import { Header } from "../../components/Header";
import { DirectoriesSettings } from "../../components/SettingsComponents/DirectoriesSettings";
import { PlaybackSettings } from "../../components/SettingsComponents/PlaybackSettings";
import { Interface } from "../../components/SettingsComponents/Interface";
import { HelpSettings } from "../../components/SettingsComponents/HelpSettings";
import styles from "./style.module.css";

export function SettingsScreen({ setScreen, setTheme }) {
  const [tab, setTab] = useState("directories");

  return (
    <div className={styles.settingsScreen}>
      <Header
        title="Configurações"
        onBack={() => setScreen("player")}
      />

      {/* Topbar de abas */}
      <nav className={styles.topbar}>
        <button
          className={`${styles.tab} ${tab === "directories" ? styles.active : ""}`}
          onClick={() => setTab("directories")}
        >
          Diretórios
        </button>
        <button
          className={`${styles.tab} ${tab === "crossfade" ? styles.active : ""}`}
          onClick={() => setTab("crossfade")}
        >
          Crossfade
        </button>
        <button
          className={`${styles.tab} ${tab === "interface" ? styles.active : ""}`}
          onClick={() => setTab("interface")}
        >
          Interface
        </button>
        <button
          className={`${styles.tab} ${tab === "ajuda" ? styles.active : ""}`}
          onClick={() => setTab("ajuda")}
        >
          Ajuda
        </button>
      </nav>

      {/* Conteúdo da aba ativa */}
      <div className={styles.content}>
        {tab === "directories" && <DirectoriesSettings />}
        {tab === "crossfade" && <PlaybackSettings />}
        {tab === "interface" && <Interface setTheme={setTheme} />}
        {tab === "ajuda" && <HelpSettings setTheme={setTheme} />}
      </div>
    </div>
  );
}