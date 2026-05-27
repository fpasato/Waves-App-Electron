import styles from "./style.module.css";
import { Button } from "../../components/Button";
import { PlaylistScreen } from "../PlaylistScreen";

import { IoOptionsSharp } from "react-icons/io5";
import { IoLibrarySharp } from "react-icons/io5";
import { FaSearch, FaHistory } from "react-icons/fa";
import { FaRadio } from "react-icons/fa6";

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
        <Button title={<FaSearch />} onClick={() => setScreen("search")} />
        <Button title={<FaHistory />} onClick={() => console.log("Recentes")} />
        <Button title={<FaRadio />} onClick={() => setScreen("radio")} />
      </div>

      <PlaylistScreen />
    </div>
  );
}
