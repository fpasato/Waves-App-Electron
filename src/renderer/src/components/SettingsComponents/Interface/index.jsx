import styles from "./style.module.css";

export function Interface() {
  return (
    <div className={styles.interface}>
      <h1>Interface</h1>
      <div className={styles.colorPicker}>
        <label htmlFor="color">Cor</label>
        <input type="color" id="color" name="color" />
      </div>
    </div>
  );
}
