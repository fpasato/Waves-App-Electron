import styles from "./style.module.css";
import { BiFirstPage, BiLastPage } from "react-icons/bi";
import { FaHome } from "react-icons/fa";

export function SearchHeader({
  query,
  setQuery,
  loading,
  onSearch,
  onClear,
  onBack,
  onForward,
  setScreen,
  onRefresh,
}) {
  return (
    <div className={styles.header}>
      <div className={styles.navButtons}>
        <button className={styles.backBtn} onClick={() => setScreen("player")}>
          <FaHome />
        </button>

        {onBack && (
          <button className={styles.backBtn} onClick={onBack}>
            <BiFirstPage />
          </button>
        )}

        <button
          className={styles.backBtn}
          onClick={onRefresh}
          disabled={loading}
        >
          ↺
        </button>
      </div>

      <form
        className={styles.searchBar}
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
      >
        <div className={styles.inputWrap}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar artista, música..."
            className={styles.input}
          />
          {query && (
            <button type="button" className={styles.clearBtn} onClick={onClear}>
              ✕
            </button>
          )}
        </div>
        <button type="submit" className={styles.searchBtn} disabled={loading}>
          {loading ? <span className={styles.spinner} /> : "Buscar"}
        </button>
      </form>
    </div>
  );
}
