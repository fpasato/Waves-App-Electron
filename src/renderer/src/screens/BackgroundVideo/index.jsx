import { Header } from "../Header"
import { SideBar } from "../SideBar"
import { SongsArea } from "../SongsArea"

import styles from './style.module.css'


export function PlayerScreen() {
    return (
        <>
            <Header />
        <div className={styles.playerScreen}>
            <SideBar />
            <SongsArea />

            <div className={styles.playerArea}>
                <h1>Player Area</h1>
            </div>
        </div>
        </>
    )
}   