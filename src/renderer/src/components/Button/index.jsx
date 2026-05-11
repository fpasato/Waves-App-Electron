import styles from './style.module.css'

export function Button({tittle, onClick}) {
    return (
       <button className={styles.buttonpattern} onClick={onClick}>
            {tittle}
        </button>
    )
}