import { useState, useEffect, useRef } from "react";
import styles from "./style.module.css";

export function LyricsDisplay({
  enabled,
  lines,               // opcional – pode ser usado para debug, mas não obrigatório
  activeIndex,
  status,
  isFading,
  currentLine,
  nextLine,
}) {
  const [displayed, setDisplayed] = useState({ current: null, next: null, key: -1 });
  const [exiting, setExiting] = useState(null);
  const [statusKey, setStatusKey] = useState(0);
  const prevLineRef = useRef(null); // guarda a linha anterior para a animação de saída

  // Atualiza a chave quando estado é "não encontrado" ou "erro"
  useEffect(() => {
    if (status === "notfound" || status === "error") {
      setStatusKey((k) => k + 1);
    }
  }, [status]);

  // Efeito principal – animação de troca de linha
  useEffect(() => {
    // Se não há linha atual, limpa tudo
    if (!currentLine) {
      setDisplayed({ current: null, next: null, key: activeIndex });
      setExiting(null);
      prevLineRef.current = null;
      return;
    }

    // Só faz a animação se a nova linha for diferente da anterior
    if (prevLineRef.current && prevLineRef.current.text !== currentLine.text) {
      // Guarda a linha anterior para a animação de saída
      setExiting(prevLineRef.current);
    } else {
      // Mesma linha (ex.: primeiro carregamento) → sem animação
      setExiting(null);
    }

    // Atualiza a referência da linha anterior
    prevLineRef.current = currentLine;

    // Timeout para remover a animação de saída e exibir a nova linha
    const t = setTimeout(() => {
      setExiting(null);
      setDisplayed({ current: currentLine, next: nextLine, key: activeIndex });
    }, 80);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, currentLine, nextLine]); // <-- sem displayed.current

  if (!enabled) return null;

  return (
    <div
      className={`${styles.lyricsWrapper} ${isFading ? styles.fading : ""}`}
      aria-live="polite"
    >
      {status === "loading" && (
        <p className={styles.statusText}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </p>
      )}

      {status === "notfound" && (
        <p key={statusKey} className={`${styles.statusText} ${styles.notFound}`}>
          letra não encontrada
        </p>
      )}

      {status === "error" && (
        <p key={statusKey} className={`${styles.statusText} ${styles.notFound}`}>
          falha ao buscar letra
        </p>
      )}

      {status === "found" && (
        <div className={styles.karaokeView}>
          {/* Linha saindo (animação) */}
          {exiting && (
            <p
              key={`exit-${displayed.key}`}
              className={`${styles.activeLine} ${styles.lineOut}`}
            >
              {exiting.text}
            </p>
          )}

          {/* Linha atual (aparece depois da animação ou imediatamente se não houve saída) */}
          {!exiting && displayed.current && (
            <p key={`active-${displayed.key}`} className={styles.activeLine}>
              {displayed.current.text}
            </p>
          )}

          {/* Próxima linha (prévia) */}
          {displayed.next && (
            <p className={styles.nextLine}>{displayed.next.text}</p>
          )}
        </div>
      )}
    </div>
  );
}