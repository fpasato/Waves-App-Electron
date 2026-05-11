import styles from './style.module.css'

export function ProgressBar() {

    const progress = 45

    return (
        <div className={styles.progressBar}>

            <div className={styles.wavebars}>
                Wavebars
            </div>

            <div className={styles.bar}>
                <div
                    className={styles.progress}
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className={styles.time}>
                00:00 / 03:21
            </div>

        </div>
    )
}