import styles from "./style.module.css";
import { Button } from "../../components/Button";
import { PlaylistScreen } from "../PlaylistScreen";

import { IoOptionsSharp } from "react-icons/io5";
import { IoLibrarySharp } from "react-icons/io5";
import { FaYoutube, FaHistory } from "react-icons/fa";
import { FaRadio, FaDownload } from "react-icons/fa6";

export function SideBar({ setScreen }) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.options}>
        <Button
          title={<IoOptionsSharp size={40} />}
          onClick={() => setScreen("settings")}
        />
        <Button
          title={<IoLibrarySharp size={40} />}
          onClick={() => setScreen("library")}
        />
        <Button title={<FaYoutube size={40} />} onClick={() => setScreen("search")} />
        <Button title={<FaHistory size={40} />} onClick={() => console.log("Recentes")} />
        <Button title={<FaRadio size={40} />} onClick={() => setScreen("radio")} />
        <Button title={<FaDownload />} onClick={() => setScreen("downloads")} />
      </div>

      <PlaylistScreen />
    </div>
  );
}
