import { Header } from "../../Components/Header";
import styles from "./style.module.css";

export function RadioScreen() {
  return (
    <div className={styles.radioScreen}>
      <Header title="Radio" />

      <div className={styles.radioContent}>
      </div>
    </div>
  );
}