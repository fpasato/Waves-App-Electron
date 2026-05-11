import styles from './style.module.css'
import { FaVolumeHigh } from "react-icons/fa6";

export function VolumeControls() {

    return (
        <div className={styles.volume}>
            <FaVolumeHigh />
        </div>
    )
}