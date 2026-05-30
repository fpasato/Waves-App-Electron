import styles from "./style.module.css"; // use o CSS do seu player

/**
 * Botão de toggle de legenda.
 * Adicione ao seu componente de player:
 *
 *   const [lyricsEnabled, setLyricsEnabled] = useState(false);
 *   ...
 *   <LyricsToggle enabled={lyricsEnabled} onToggle={() => setLyricsEnabled(v => !v)} />
 */
export function LyricsToggle({ enabled, onToggle }) {
  return (
    <button
      className={`${styles.lyricsToggle} ${enabled ? styles.lyricsToggleActive : ""}`}
      onClick={onToggle}
      aria-label={enabled ? "Desativar legenda" : "Ativar legenda"}
      title={enabled ? "Desativar legenda" : "Ativar legenda"}
    >
      <LyricsIcon />
    </button>
  );
}

function LyricsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Balão de fala representando letra */}
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      {/* Linhas de texto dentro */}
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="13" y2="13" />
    </svg>
  );
}