import styles from './style.module.css'
import { Button } from '../../components/Button'
import { randomCover } from '../../utils/randomCover'

export function SideBar({ setScreen }) {
    return (
        <div className={styles.sidebar}>
            
            <div className={styles.options}>
                <Button title="Configurações" onClick={() => setScreen('settings')} />
                <Button title="Biblioteca" onClick={() => setScreen('library')} />
                <Button title="Favoritos" onClick={() => console.log('Favoritos clicked')} />
                <Button title="Recentes" onClick={() => console.log('Recentes clicked')} />
            </div>            


            <div className={styles.playlists}>
                <div className={styles.playlistsHeader}>
                    <h1 className={styles.playlistsTitle}>Playlists</h1>
                    <button className={styles.createPlaylistButton}> + </button>
                </div>
                <div className={styles.playlistsList}>
                    
                    <div className={styles.playlistItem}>
                        <img src={randomCover()} alt="" />
                        <h3>Playlist name</h3>
                    </div>
                </div>

            </div>

        </div>
    )
}