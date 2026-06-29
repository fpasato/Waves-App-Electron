import { IoArrowBack } from "react-icons/io5";
import styles from "./style.module.css";

export function Header({ title, onBack, children }) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {onBack && (
          <button className={styles.backButton} onClick={onBack}>
            <IoArrowBack size={14} />
            <span>Voltar</span>
          </button>
        )}
      </div>

      <h1 className={styles.title}>{title}</h1>

      <div className={styles.actions}>
        {children}
      </div>
    </header>
  );
}