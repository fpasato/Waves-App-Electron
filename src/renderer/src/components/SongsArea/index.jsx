import styles from './style.module.css'
import { Button } from '../Button'

export function SongsArea() {
    return (
        <div className={styles.songsArea}>
            <h1>Fila de Reprodução</h1>
            <div className={styles.songsList}>
                <div className={styles.songItem}>
                    <h2 className={styles.songTitle}>Música 1</h2>
                    <p className={styles.songArtist}>Artista 1</p>
                    
                </div>
            </div>
            <div className={styles.clearButton}>
                <Button tittle="Limpar Fila" />
            </div>
        </div>
    )
}