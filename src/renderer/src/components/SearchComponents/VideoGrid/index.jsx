import styles from "./style.module.css";

export function VideoGrid({ items, loading, loadingId, onCardClick, onDownloadClick }) {
  if (loading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {items.map(item => (
        <div key={item.id} className={styles.card} onClick={() => onCardClick(item)}>
          <div className={styles.thumb}>
            <img src={item.thumbnail?.replace("http://", "https://")} alt={item.title} />
            <div className={styles.overlay}>
              {loadingId === item.id
                ? <span className={styles.spinnerLarge} />
                : <span className={styles.playIcon}>▶</span>}
            </div>
            <span className={styles.duration}>{item.duration}</span>
          </div>
          <div className={styles.info}>
            <p className={styles.title}>{item.title}</p>
            <p className={styles.channel}>{item.channel}</p>
          </div>
          <button onClick={(e) => onDownloadClick(e, item)} className={styles.downloadBtn}>⬇</button>
        </div>
      ))}
    </div>
  );
}