
import styles from './style.module.css'

export function BackgroundVideo({ src }) {
  if (!src) return <div className={styles.backgroundVideo} />
  return (
    <div className={styles.backgroundVideo}>
      <video src={src} autoPlay loop muted />
    </div>
  )
}