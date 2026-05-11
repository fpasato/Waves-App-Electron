import styles from './style.module.css'
import { Button } from '../../components/Button'

export function SideBar() {
    return (
        <div className={styles.sidebar}>
            
            <div className={styles.options}>
                <Button tittle="Configurações" onClick={() => console.log('Configurações clicked')} />
                <Button tittle="Biblioteca" onClick={() => console.log('Biblioteca clicked')} />
                <Button tittle="Favoritos" onClick={() => console.log('Favoritos clicked')} />
                <Button tittle="Recentes" onClick={() => console.log('Recentes clicked')} />
            </div>            


            <div className={styles.playlists}>
                <div className={styles.playlistsHeader}>
                    <h1 className={styles.playlistsTitle}>Playlists</h1>
                    <button className={styles.createPlaylistButton}> + </button>
                </div>
                <div className={styles.playlistsList}>
                    
                    <div className={styles.playlistItem}>
                        <img src="" alt="" />
                        <h3>Playlist name</h3>
                    </div>
                </div>

            </div>

        </div>
    )
}