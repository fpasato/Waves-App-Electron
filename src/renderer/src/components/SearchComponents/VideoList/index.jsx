import styles from "./style.module.css";

export function VideoList({ items, loading, loadingId, onCardClick }) {
  if (loading) {
    return (
      <div className={styles.list}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={styles.skeletonRow} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {items.map(item => (
        <div key={item.id} className={styles.card} onClick={() => onCardClick(item)}>
          <div className={styles.thumb}>
            <img src={item.thumbnail?.replace("http://", "https://")} alt={item.title} />
            {loadingId === item.id && (
              <div className={styles.thumbOverlay}><span className={styles.spinner} /></div>
            )}
          </div>
          <div className={styles.info}>
            <p className={styles.title}>{item.title}</p>
            <p className={styles.channel}>{item.channel}</p>
            <span className={styles.duration}>{item.duration}</span>
          </div>
        </div>
      ))}
    </div>
  );
}