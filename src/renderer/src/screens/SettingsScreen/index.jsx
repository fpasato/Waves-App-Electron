import { useState } from "react";
import { Header } from "../../Components/Header";
import { PlaybackSettings } from "../../components/PlaybackSettings";
import { DirectoriesSettings } from "../../components/DirectoriesSettings";
import { Button } from "../../components/Button";

import styles from "./style.module.css";

export function SettingsScreen({ setScreen }) {
  const [tab, setTab] = useState("directories");

  return (
    <div className={styles.settingsScreen}>
      <Header title="Configurações" />

      <div className={styles.container}>
        <nav className={styles.sidebar}>
          <div className={styles.topOptions}>
            <Button
              title="Diretórios"
              onClick={() => setTab("directories")}
              className={`${styles.tab} ${tab === "directories" ? styles.active : ""}`}
            />
            <Button
              title="crossfade"
              onClick={() => setTab("crossfade")}
              className={`${styles.tab} ${tab === "crossfade" ? styles.active : ""}`}
            />
          </div>

          <Button
            title="Voltar"
            onClick={() => setScreen("player")}
            className={styles.backButton}
          />
        </nav>

        <div className={styles.content}>
          {tab === "directories" && <DirectoriesSettings />}
          {tab === "crossfade" && <PlaybackSettings />}
        </div>
      </div>
    </div>
  );
}
