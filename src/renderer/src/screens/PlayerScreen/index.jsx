import styles from './style.module.css';

import { Header } from '../../Components/Header';
import { SideBar } from '../../Components/Sidebar';
import { SongsArea } from '../../Components/SongsArea';
import { BackgroundVideo } from '../../Components/BackgroundVideo';
import { PlayerControls } from '../../Components/PlayerControls';
import { ProgressBar } from '../../Components/ProgressBar';
import { VolumeControls } from '../../Components/VolumeControls';
export function PlayerScreen() {
  return (
    <div className={styles.playerScreen}>

      <Header />

      <div className={styles.content}>
        <SideBar />
        <BackgroundVideo />
        <SongsArea />
      </div>

      <div className={styles.playerArea}>
        <div className={styles.musicInfo}>
          <div className={styles.cover} />
          <div className={styles.musicDetails}>
            <h3>Music Name</h3>
            <p>Artist Name</p>
          </div>
        </div>
        <PlayerControls />
        <ProgressBar />
        <VolumeControls />
      </div>

    </div>
  );
}
