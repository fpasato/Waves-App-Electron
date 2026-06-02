import { useState } from "react";
import { Header } from "../../Components/Header";
import { PlaybackSettings } from "../../components/PlaybackSettings";
import { DirectoriesSettings } from "../../components/DirectoriesSettings";
import { HelpSettings } from "../../components/HelpSettings";
import { Interface } from "../../components/SettingsComponents/Interface";
import { Button } from "../../components/Button";
import { LyricsSettings } from "../../components/LyricsSettings";

import styles from "./style.module.css";

export function SettingsScreen({ setScreen, setTheme }) {
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
              title="Crossfade"
              onClick={() => setTab("crossfade")}
              className={`${styles.tab} ${tab === "crossfade" ? styles.active : ""}`}
            />{" "}
            <Button
              title="Interface"
              onClick={() => setTab("interface")}
              className={`${styles.tab} ${tab === "interface" ? styles.active : ""}`}
            />{" "}
            <Button
              title="Legendas"
              onClick={() => setTab("legendas")}
              className={`${styles.tab} ${tab === "legendas" ? styles.active : ""}`}
            />            <Button
              title="Ajuda"
              onClick={() => setTab("ajuda")}
              className={`${styles.tab} ${tab === "ajuda" ? styles.active : ""}`}
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
          {tab === "interface" && <Interface setTheme={setTheme} />}
          {tab === "legendas" && <LyricsSettings />}
          {tab === "ajuda" && <HelpSettings setTheme={setTheme} />}
        </div>
      </div>
    </div>
  );
}
