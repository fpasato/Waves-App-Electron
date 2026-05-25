import { useState, useEffect, useCallback, useRef } from "react";

export function useSearch() {
  const [featured, setFeatured] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState("featured");
  const [query, setQuery] = useState("");

  const lastQueryRef = useRef(""); // guarda a última busca pra o refresh saber o que rebuscar

  const loadFeatured = useCallback(async (forceRefresh = false) => {
    setFeaturedLoading(true);
    try {
      const profile = await window.profile?.getUserProfile?.();
      const history = profile?.searchHistory || [];
      const DEFAULT_QUERIES = [
        "pop hits 2025",
        "rock classics",
        "hip hop 2025",
        "electronic music",
        "indie 2025",
        "jazz hits",
      ];

      const historySlice = history.slice(0, 6);
      const queries = [...historySlice, ...DEFAULT_QUERIES].slice(0, 6);

      const allResults = await Promise.all(
        queries.map((q) =>
          window.api.youtube.search(q, forceRefresh).then((r) => r.slice(0, 5))
        )
      );

      const seen = new Set();
      const merged = allResults.flat().filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      setFeatured(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatured();
  }, [loadFeatured]);

  const handleSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) return;
    lastQueryRef.current = searchQuery;
    setLoading(true);
    setError(null);
    setView("results");
    try {
      const items = await window.api.youtube.search(searchQuery);
      setResults(items);
      window.profile?.saveSearchHistory(searchQuery);
    } catch (err) {
      setError("Erro ao buscar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh igual ao do YouTube: recarrega o que está visível ignorando cache
  const refresh = useCallback(async () => {
     console.log("refresh chamado, view:", view, "lastQuery:", lastQueryRef.current);
    if (view === "results" && lastQueryRef.current) {
      setLoading(true);
      setError(null);
      try {
        const items = await window.api.youtube.search(lastQueryRef.current, true); // forceRefresh
        setResults(items);
      } catch {
        setError("Erro ao atualizar. Tente novamente.");
      } finally {
        setLoading(false);
      }
    } else {
      await loadFeatured(true); // forceRefresh
    }
  }, [view, loadFeatured]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setView("featured");
    setResults([]);
    setError(null);
  }, []);

  return {
    featured,
    featuredLoading,
    results,
    loading,
    error,
    view,
    query,
    setQuery,
    setView,
    handleSearch,
    clearSearch,
    refresh, // ← novo
  };
}