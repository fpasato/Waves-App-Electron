import styles from './style.module.css';
import { randomCover } from '../../utils/randomCover';
import { Button } from '../Button';
import { usePlayerStore } from '../../store/playerStore';

export function SongsArea() {
  const { queue, queueIndex, shuffle, shuffleQueue, shufflePos, clearQueue, stop } = usePlayerStore();

  if (queue.length === 0) {
    return (
      <div className={styles.songsArea}>
        <h1>Fila de Reprodução</h1>
        <p className={styles.emptyMessage}>A fila está vazia</p>
      </div>
    );
  }

  const orderedQueue = shuffle && shuffleQueue.length > 0
    ? shuffleQueue.map((idx) => queue[idx]).filter(Boolean)
    : queue;

  // Com shuffle: posição atual é shufflePos dentro da orderedQueue
  // Sem shuffle: posição atual é queueIndex dentro de queue (que é a orderedQueue)
  const currentPos = shuffle && shuffleQueue.length > 0 ? shufflePos : queueIndex;

  return (
    <div className={styles.songsArea}>
      <h1>Fila de Reprodução</h1>

      <div className={styles.songsList}>
        {orderedQueue.map((track, index) => {
          const isCurrent = index === currentPos;
          const isNext = index === currentPos + 1;
          const isPast = index < currentPos;

          return (
            <div
              key={track.id ?? index}
              className={`
                ${styles.songItem}
                ${isCurrent ? styles.current : ''}
                ${isNext ? styles.next : ''}
                ${isPast ? styles.past : ''}
              `}
            >
              <div className={styles.songCover}>
                <img src={track.cover || randomCover(track.title)} alt={track.title} />
                {isCurrent && (
                  <span className={styles.nowPlayingBadge}>▶</span>
                )}
              </div>

              <div className={styles.songInfo}>
                {isCurrent && <span className={styles.currentBadge}>Tocando agora</span>}
                {isNext && <span className={styles.nextBadge}>A seguir</span>}
                <h2 className={styles.songTitle}>{track.title}</h2>
                <p className={styles.songArtist}>{track.artist}</p>
              </div>

              <span className={styles.songIndex}>
                {isCurrent ? '♫' : isPast ? '✓' : `#${index - currentPos + 1}`}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.clearButton}>
        <Button
          title="Limpar Fila e Parar Música"
          onClick={() => {
            clearQueue();
            stop();
          }}
        />
      </div>
    </div>
  );
}