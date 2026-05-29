// src/Components/FavoriteItem.jsx
import { useState } from "react";
import { randomCover } from "../../../utils/randomCover";
import { IconPlay, IconTrash } from "../Icons";
import styles from "./FavoriteItem.module.css";

const BASE_URL = "https://www.radios.com.br";

export function FavoriteItem({ radio, onNavigate, onRemove }) {
  const [imgError, setImgError] = useState(false);
  const fallback = randomCover(radio.id || radio.name);
  const src = radio.favicon && !imgError ? radio.favicon : fallback;
  const radioUrl =
    radio.pageUrl || `${BASE_URL}/aovivo/${radio.slug || radio.id}`;

  return (
    <div className={styles.favItem}>
      <button
        className={styles.favItemMain}
        onClick={() => onNavigate(radioUrl)}
        title={`Abrir ${radio.name}`}
      >
        <img
          className={styles.favItemThumb}
          src={src}
          alt={radio.name}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
        <span className={styles.favItemName}>{radio.name}</span>
      </button>
      <div className={styles.favItemActions}>
        <button
          className={styles.favItemPlay}
          onClick={() => onNavigate(radioUrl)}
          title="Abrir no site"
        >
          <IconPlay />
        </button>
        <button
          className={styles.favItemRemove}
          onClick={() => onRemove(radio)}
          title="Remover favorito"
        >
          <IconTrash />
        </button>
      </div>
    </div>
  );
}