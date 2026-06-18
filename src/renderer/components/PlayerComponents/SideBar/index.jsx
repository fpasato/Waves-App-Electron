import styles from "./style.module.css";
import { PlaylistScreen } from "../PlaylistScreen";

import { IoOptionsSharp } from "react-icons/io5";
import { IoLibrarySharp } from "react-icons/io5";
import { FaYoutube, FaHistory } from "react-icons/fa";
import { FaRadio, FaDownload  } from "react-icons/fa6";
import { FaPhotoVideo } from "react-icons/fa";

export function SideBar({ setScreen }) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.optionsContainer}>
        <div className={styles.optionsGroup}>
          <button
            className={styles.sidebarButton}
            onClick={() => setScreen("search")}
          >
            <FaYoutube size={18} />
            <span>Youtube</span>
          </button>
          <button
            className={styles.sidebarButton}
            onClick={() => setScreen("radio")}
          >
            <FaRadio size={18} />
            <span>Rádio</span>
          </button>
          <button
            className={styles.sidebarButton}
            onClick={() => setScreen("library")}
          >
            <IoLibrarySharp size={18} />
            <span>Biblioteca</span>
          </button>{" "}
          <button
            className={styles.sidebarButton}
            onClick={() => setScreen("videoplayer")}
          >
            <FaPhotoVideo size={18} />
            <span>Video Player</span>
          </button>
        </div>

        <div className={styles.optionsGroup}>
          <button
            className={styles.sidebarButton}
            onClick={() => setScreen("recents")}
          >
            <FaHistory size={18} />
            <span>Recentes</span>
          </button>
          <button
            className={styles.sidebarButton}
            onClick={() => setScreen("downloads")}
          >
            <FaDownload size={18} />
            <span>Downloads</span>
          </button>
        </div>

        <div className={styles.optionsGroup}>
          <button
            className={styles.sidebarButton}
            onClick={() => setScreen("settings")}
          >
            <IoOptionsSharp size={18} />
            <span>Configurações</span>
          </button>
        </div>
      </div>
      <PlaylistScreen />
    </div>
  );
}
