import styles from "./style.module.css";

export function HelpSettings() {
  return (
    <div className={styles.helpSettings}>
      <h1>Dicas de uso</h1>

      <section className={styles.section}>
        <h2>Biblioteca</h2>
        <p>
          Se você remover pastas de músicas, é necessário adicioná-las novamente
          para atualizar a biblioteca.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Nomes de arquivos</h2>
        <p>
          Para melhor organização e funcionamento das legendas, use sempre o
          padrão:
        </p>
        <p className={styles.code}>[Artista] - [Nome da música].mp3</p>
        <p>Exemplo: Coldplay - Yellow.mp3</p>
      </section>

      <section className={styles.section}>
        <h2>Rádio</h2>
        <p>
          Caso uma rádio não apareça na lista, tente atualizar a lista ou
          contribuir com o{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.radio-browser.info"
          >
            Radio Browser
          </a>
          .
        </p>
      </section>

      <section className={styles.section}>
        <h2>Problemas comuns</h2>
        <p>
          O bloqueador de anúncios pode falhar em alguns casos. Se isso
          acontecer, reinicie a página.
        </p>
      </section>
    </div>
  );
}
