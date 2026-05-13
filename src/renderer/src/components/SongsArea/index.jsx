import styles from './style.module.css';

import { randomCover } from '../../utils/randomCover';
import { Button } from '../Button';
import { usePlayer } from '../../store/PlayerContext';

export function SongsArea() {
  const { state, dispatch } = usePlayer();
  const queue = state.queue ?? [];

  if (queue.length === 0) {
    return (
      <div className={styles.songsArea}>
        <h1>Fila de Reprodução</h1>
        <p>A fila está vazia</p>
      </div>
    );
  }

  return (
    <div className={styles.songsArea}>
      <h1>Fila de Reprodução</h1>
      <div className={styles.songsList}>
        {queue.map((track, index) => (
          <div key={track.id ?? index} className={styles.songItem}>
            <h2 className={styles.songTitle}>{track.title}</h2>
            <p className={styles.songArtist}>{track.artist}</p>
          </div>
        ))}
      </div>
      <div className={styles.clearButton}>
        <Button
          tittle="Limpar Fila e Parar Música"
          onClick={() => {
            dispatch({ type: 'CLEAR_QUEUE' });
            dispatch({ type: 'STOP' });
          }}
        />
      </div>
    </div>
  );
}
