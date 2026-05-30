import styles from "./style.module.css";
import { Button } from "../../components/Button";
import { PlaylistScreen } from "../PlaylistScreen";

import { IoOptionsSharp } from "react-icons/io5";
import { IoLibrarySharp } from "react-icons/io5";
import { FaYoutube, FaHistory } from "react-icons/fa";
import { FaRadio } from "react-icons/fa6";
import { ImFolderDownload } from "react-icons/im";

export function SideBar({ setScreen }) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.options}>
        <Button
          title={<IoOptionsSharp />}
          onClick={() => setScreen("settings")}
        />
        <Button
          title={<IoLibrarySharp />}
          onClick={() => setScreen("library")}
        />
        <Button title={<FaYoutube />} onClick={() => setScreen("search")} />
        <Button title={<FaHistory />} onClick={() => console.log("Recentes")} />
        <Button title={<FaRadio />} onClick={() => setScreen("radio")} />
        <Button title={<ImFolderDownload />} onClick={() => setScreen("downloads")} />
      </div>

      <PlaylistScreen />
    </div>
  );
}
