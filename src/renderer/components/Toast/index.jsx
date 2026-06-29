import { useEffect, useState } from "react";
import styles from "./style.module.css";
import { FaCheck, FaTimes, FaExclamationTriangle } from "react-icons/fa";

export function Toast({ toasts, onDismiss }) {
  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [dismissing, setDismissing] = useState(false);

  function dismiss() {
    setDismissing(true);
    setTimeout(() => onDismiss(toast.id), 200);
  }

  useEffect(() => {
    const timer = setTimeout(dismiss, toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.id]);

  return (
    <div className={`${styles.toast} ${styles[toast.type ?? "info"]} ${dismissing ? styles.dismissing : ""}`}>
      <span className={styles.icon}>
        {toast.type === "success" && <FaCheck />}
        {toast.type === "error" && <FaTimes />}
        {toast.type === "warning" && <FaExclamationTriangle />}
      </span>
      <span className={styles.message}>{toast.message}</span>
      <button className={styles.close} onClick={dismiss}>
        <FaTimes />
      </button>
    </div>
  );
} 