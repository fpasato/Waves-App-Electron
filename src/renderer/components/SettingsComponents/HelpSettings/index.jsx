import styles from "./style.module.css";

export function HelpSettings() {
  return (
    <div className={styles.helpSettings}>
      <h1>Dicas de uso</h1>
      <p className={styles.intro}>
        Aqui você encontra explicações rápidas sobre como tirar o melhor
        proveito do app e o que fazer caso algo não funcione como esperado.
      </p>

      <section className={styles.section}>
        <h2>Biblioteca de músicas</h2>
        <p>
          O app não detecta automaticamente quando uma pasta de músicas é
          removida do computador. Por isso, se você apagar ou mover uma
          pasta, é necessário adicioná-la novamente nas configurações para
          que a biblioteca seja atualizada corretamente.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Como nomear seus arquivos</h2>
        <p>
          As legendas e a identificação de artista/música funcionam com base
          no nome do arquivo. Para que tudo funcione bem, siga este padrão:
        </p>
        <p className={styles.code}>[Artista] - [Nome da música].mp3</p>
        <ul>
          <li><code>Coldplay - Yellow.mp3</code></li>
          <li><code>Legião Urbana - Tempo Perdido.mp3</code></li>
        </ul>
        <p>
          Evite usar apenas o nome da música ou nomes genéricos (como{" "}
          <code>faixa01.mp3</code>), pois isso impede o app de reconhecer o
          artista corretamente.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Rádios não aparecem na lista?</h2>
        <p>
          As rádios disponíveis vêm de uma base colaborativa. Se a rádio que
          você procura não estiver na lista, você pode:
        </p>
        <ul>
          <li>Atualizar a lista de rádios dentro do app.</li>
          <li>
            Cadastrar a rádio diretamente no site Radio Browser, a base
            usada pelo app — assim ela passa a ficar disponível para todo
            mundo.{" "}
            <a href="https://www.radio-browser.info" target="_blank" rel="noopener noreferrer">
              Acessar Radio Browser
            </a>
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Problemas comuns</h2>
        <p>
          <strong>Bloqueador de anúncios (ad blocker):</strong> em alguns
          casos, ele pode interferir no carregamento de algumas funções do
          app. Se notar algo travado ou fora do lugar, recarregue a página
          (F5) — isso costuma resolver.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Onde ficam meus arquivos salvos</h2>
        <p>
          Tudo que você baixa ou grava é salvo dentro da pasta{" "}
          <strong>Waves</strong>, organizada automaticamente por tipo de
          conteúdo:
        </p>
        <ul>
          <li><strong>Waves/Gravações</strong> → gravações feitas a partir do rádio</li>
          <li><strong>Waves/Áudios</strong> → áudios baixados</li>
          <li><strong>Waves/Vídeos</strong> → vídeos baixados</li>
        </ul>
        <p>
          Assim, em vez de tudo misturado em uma pasta só, você sempre sabe
          onde procurar cada tipo de arquivo.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Video Player (experimental)</h2>
        <p>
          Esse recurso ainda está em fase de testes. Ele já funciona na
          maioria dos casos, mas pode apresentar instabilidade ou não
          funcionar em alguns dispositivos. Se encontrar algum problema, isso
          é esperado.
        </p>
      </section>
    </div>
  );
}