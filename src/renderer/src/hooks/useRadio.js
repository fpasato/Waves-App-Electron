import { useState, useRef, useEffect, useCallback } from "react";
import { RadioBrowserApi } from "radio-browser-api";

const api = new RadioBrowserApi("AuraPlayer");
const FAVORITES_KEY = "aura:radio:favorites";
const LAST_RADIO_KEY = "aura:radio:last";

const BRAZILIAN_POPULAR = [
  "Coca Cola FM",
  "Jovem Pan FM",
  "Mix FM",
  "89 FM",
  "Kiss FM",
  "Antena 1",
  "Alpha FM",
  "Band FM",
  "Metropolitana FM",
  "Disney FM",
  "CBN",
  "Transamérica FM",
];

function loadStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// Garante um ID único para cada estação
function normalizeRadio(station) {
  return {
    id: station.stationuuid || crypto.randomUUID(),

    name: station.name || "Rádio",

    favicon: typeof station.favicon === "string" ? station.favicon : "",

    stream: station.urlResolved || station.url_resolved || station.url || "",

    country: station.country || "",
    state: station.state || "",
    bitrate: station.bitrate || 0,
    codec: station.codec || "",

    tags:
      typeof station.tags === "string"
        ? station.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
  };
}

export function useRadio() {
  const audioRef = useRef(null);

  const [query, setQuery] = useState("");
  const [radios, setRadios] = useState([]);
  const [popularRadios, setPopularRadios] = useState([]);
  const [favorites, setFavorites] = useState(() =>
    loadStorage(FAVORITES_KEY, []),
  );
  const [currentRadio, setCurrentRadio] = useState(() =>
    loadStorage(LAST_RADIO_KEY, null),
  );
  const [activeTab, setActiveTab] = useState("search");
  const [loading, setLoading] = useState(false);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState(null);

  // ─── Inicializa o áudio ──────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;

    const handlers = {
      play: () => {
        setIsPlaying(true);
        setIsBuffering(false);
      },
      pause: () => {
        setIsPlaying(false);
        setIsBuffering(false);
      },
      waiting: () => setIsBuffering(true),
      playing: () => {
        setIsBuffering(false);
        setIsPlaying(true);
      },
      error: () => {
        setIsPlaying(false);
        setIsBuffering(false);
        setError("Falha ao reproduzir esta rádio.");
      },
    };

    Object.entries(handlers).forEach(([event, fn]) =>
      audio.addEventListener(event, fn),
    );

    return () => {
      audio.pause();
      audio.src = "";
      Object.entries(handlers).forEach(([event, fn]) =>
        audio.removeEventListener(event, fn),
      );
    };
  }, []);

  // ─── Persistência ────────────────────────────────────────
  useEffect(() => saveStorage(FAVORITES_KEY, favorites), [favorites]);
  useEffect(() => saveStorage(LAST_RADIO_KEY, currentRadio), [currentRadio]);

  // ─── Busca rádios populares (top click) ─────────────────
  const fetchPopularRadios = useCallback(async () => {
    setLoadingPopular(true);
    setError(null);

    try {
      const results = await Promise.all(
        BRAZILIAN_POPULAR.map((name) =>
          api.searchStations({
            name,
            limit: 1,
            hideBroken: true,
          }),
        ),
      );

      const stations = results.flat().filter(Boolean);

      const formatted = stations
        .filter((s) => s.urlResolved || s.url_resolved || s.url)
        .map(normalizeRadio);

      setPopularRadios(formatted);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar rádios.");
    } finally {
      setLoadingPopular(false);
    }
  }, []);

  // ─── Busca por nome ──────────────────────────────────────
  const searchRadios = useCallback(async (text) => {
    const value = text?.trim();
    if (!value) {
      setRadios([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const stations = await api.searchStations({
        order: "clickcount",
        reverse: true,
        limit: 50,
        hideBroken: true,
      });
      const formatted = stations
        .filter((s) => s.urlResolved || s.url)
        .map(normalizeRadio);
      setRadios(formatted);
      if (formatted.length === 0) setError("Nenhuma rádio encontrada.");
    } catch (err) {
      console.error(err);
      setError("Erro ao buscar rádios.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Controle de reprodução ─────────────────────────────
  const playRadio = useCallback(
    async (radio) => {
      if (!radio?.stream) {
        setError("Stream inválido.");
        return;
      }
      const audio = audioRef.current;
      setError(null);

      try {
        if (currentRadio?.id === radio.id) {
          isPlaying
            ? audio.pause()
            : (setIsBuffering(true), await audio.play());
          return;
        }
        audio.pause();
        audio.src = radio.stream;
        setCurrentRadio(radio);
        setIsBuffering(true);
        await audio.play();
      } catch (err) {
        console.error(err);
        setIsBuffering(false);
        setError("Não foi possível tocar esta rádio.");
      }
    },
    [currentRadio, isPlaying],
  );

  const pauseRadio = useCallback(() => audioRef.current?.pause(), []);
  const stopRadio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setIsBuffering(false);
  }, []);

  // ─── Favoritos ──────────────────────────────────────────
  const toggleFavorite = useCallback((radio) => {
    setFavorites((prev) =>
      prev.some((item) => item.id === radio.id)
        ? prev.filter((item) => item.id !== radio.id)
        : [...prev, radio],
    );
  }, []);

  const isFavorite = useCallback(
    (id) => favorites.some((radio) => radio.id === id),
    [favorites],
  );

  // ─── Carrega populares ao montar ────────────────────────
  useEffect(() => {
    fetchPopularRadios();
  }, [fetchPopularRadios]);

  return {
    query,
    setQuery,
    searchRadios,
    radios,
    popularRadios,
    favorites,
    loading,
    loadingPopular,
    error,
    currentRadio,
    isPlaying,
    isBuffering,
    activeTab,
    setActiveTab,
    playRadio,
    pauseRadio,
    stopRadio,
    toggleFavorite,
    isFavorite,
  };
}
