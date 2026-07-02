import { useState, useEffect, useRef } from "react";
import { usePlayer } from "../store/PlayerContext";
import { usePlayerStore } from "../store/playerStore";

const LRCLIB_BASE = "https://lrclib.net/api";

const VERSION_SUFFIXES = [
  /\(slowed[\s+&]*reverb\)/gi,
  /\[slowed[\s+&]*reverb\]/gi,
  /\(slowed\)/gi,
  /\[slowed\]/gi,
  /\(reverb\)/gi,
  /\[reverb\]/gi,
  /\(sped[\s-]*up\)/gi,
  /\[sped[\s-]*up\]/gi,
  /\(nightcore\)/gi,
  /\[nightcore\]/gi,
  /\(remix\)/gi,
  /\[remix\]/gi,
];

const ALWAYS_NOISE = [
  /\s*[-–]\s*clipe\s*oficial\b.*/gi,
  /\(clipe\s*oficial\)/gi,
  /\(official[\w\s]*\)/gi,
  /\[official[\w\s]*\]/gi,
  /\(lyrics?\)/gi,
  /\[lyrics?\]/gi,
  /\(audio\)/gi,
  /\[audio\]/gi,
  /\(visualizer\)/gi,
  /\[visualizer\]/gi,
  /\(from\s+[^)]+\)/gi,
  /\[from\s+[^\]]+\]/gi,
];

const FEAT_NOISE = [
  /\(?ft\.?\s+[^,\[\)(]+\)?/gi,
  /\(?feat\.?\s+[^,\[\)(]+\)?/gi,
  /\(?part\.?\s+[^,\[\)(]+\)?/gi,
];

function removeYoutubeChannel(str) {
  return str
    .replace(/\s*[-–][^-–]*\(youtube\)\s*$/i, "")
    .replace(/\s*\(youtube\)\s*$/i, "");
}

function cleanBase(raw) {
  if (!raw) return "";
  let t = raw.trim();
  t = removeYoutubeChannel(t);
  for (const re of ALWAYS_NOISE) t = t.replace(re, "");
  for (const re of FEAT_NOISE) t = t.replace(re, "");
  return t.trim();
}

function cleanFull(raw) {
  let t = cleanBase(raw);
  for (const re of VERSION_SUFFIXES) t = t.replace(re, "");
  return t.trim();
}

function cleanArtist(raw) {
  if (!raw) return "";
  let a = cleanFull(raw);
  a = a.split(/[,&/]/)[0];
  return a.trim();
}

function splitArtistTitle(str) {
  const m = str.match(/^(.+?)\s*[-–]\s*(.+)$/);
  return m ? { artist: m[1].trim(), title: m[2].trim() } : null;
}

function getFileNameWithoutExtension(filePath) {
  if (!filePath) return null;
  const parts = filePath.split(/[\\/]/);
  const name = parts[parts.length - 1];
  const dot = name.lastIndexOf(".");
  return dot === -1 ? name : name.substring(0, dot);
}

function parseLRC(lrcString) {
  if (!lrcString) return [];
  const timeRe = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
  const result = [];
  for (const line of lrcString.split("\n")) {
    const matches = [...line.matchAll(timeRe)];
    if (!matches.length) continue;
    const text = line.replace(timeRe, "").trim();
    if (!text) continue;
    for (const m of matches) {
      const time =
        parseInt(m[1], 10) * 60 +
        parseInt(m[2], 10) +
        parseInt(m[3].padEnd(3, "0"), 10) / 1000;
      result.push({ time, text });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

async function fetchLyrics(rawTitle, rawArtist, filePath, duration, signal) {
  const targetDuration = duration ? Math.round(duration) : null;
  const attempts = [];
  const seen = new Set();

  const push = (track_name, artist_name) => {
    if (!track_name) return;
    const key = `${track_name}|${artist_name ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    const p = { track_name };
    if (artist_name) p.artist_name = artist_name;
    attempts.push(p);
  };

  const fileName = getFileNameWithoutExtension(filePath);
  if (fileName) {
    const split = splitArtistTitle(fileName);
    if (split) {
      const artist = cleanArtist(split.artist);
      push(cleanBase(split.title), artist);
      push(cleanFull(split.title), artist);
      push(cleanFull(split.title));
    }
  }

  push(cleanFull(rawTitle), cleanArtist(rawArtist));
  push(cleanFull(rawTitle));

  // ---- /api/get: match exato (track_name + artist_name [+ duration]) ----
  const getAttempts = attempts.filter((p) => p.artist_name);

  const tryGet = async (params) => {
    const qs = { ...params };
    if (targetDuration) qs.duration = String(targetDuration);

    const url = `${LRCLIB_BASE}/get?${new URLSearchParams(qs)}`;
    const timeout = AbortSignal.timeout(12000);
    const combined = AbortSignal.any
      ? AbortSignal.any([signal, timeout])
      : signal;

    const res = await fetch(url, { signal: combined });
    if (!res.ok) return null; // 404 = sem match exato

    const data = await res.json();
    if (!data?.syncedLyrics) return null;

    const parsed = parseLRC(data.syncedLyrics);
    if (!parsed.length) return null;

    console.log(
      `[fetchLyrics] (get) ${data.trackName} – ${data.artistName}`,
    );
    return parsed;
  };

  // ---- /api/search: busca + filtro por diferença de duração ----
  const trySearch = async (params) => {
    const url = `${LRCLIB_BASE}/search?${new URLSearchParams(params)}`;
    const timeout = AbortSignal.timeout(8000);
    const combined = AbortSignal.any
      ? AbortSignal.any([signal, timeout])
      : signal;

    const res = await fetch(url, { signal: combined });
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;

    const withSynced = data.filter((r) => r.syncedLyrics);
    if (!withSynced.length) return null;

    const best = targetDuration
      ? withSynced.reduce((a, b) =>
          Math.abs(a.duration - targetDuration) <=
          Math.abs(b.duration - targetDuration)
            ? a
            : b,
        )
      : withSynced[0];

    const diff = targetDuration ? Math.abs(best.duration - targetDuration) : 0;

    const parsed = parseLRC(best.syncedLyrics);
    if (!parsed.length) return null;

    console.log(
      `[fetchLyrics] (search) ${best.trackName} – ${best.artistName} (diff: ${diff}s)`,
    );
    return { parsed, diff };
  };

  // Roda tudo em paralelo: /get (match exato) e /search (com filtro)
  const [getSettled, searchSettled] = await Promise.all([
    Promise.allSettled(getAttempts.map((p) => tryGet(p))),
    Promise.allSettled(attempts.map((p) => trySearch(p))),
  ]);

  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  console.log("[fetchLyrics] attempts:", attempts);
  console.log(
    "[fetchLyrics] get results:",
    getSettled.map((r) =>
      r.status === "fulfilled" ? !!r.value : r.reason?.message,
    ),
  );
  console.log(
    "[fetchLyrics] search results:",
    searchSettled.map((r) =>
      r.status === "fulfilled"
        ? r.value
          ? { diff: r.value.diff }
          : "no-match"
        : r.reason?.message,
    ),
  );

  // 1ª prioridade: match exato via /get
  for (const r of getSettled) {
    if (r.status === "fulfilled" && r.value) return r.value;
  }

  // 2ª prioridade: /search com duração próxima (tudo ou nada, diff <= 10s)
  for (const r of searchSettled) {
    if (r.status === "fulfilled" && r.value && r.value.diff <= 10) {
      return r.value.parsed;
    }
  }

  return [];
}

let lastFetchedSongId = null;

const MIN_GAP_SECONDS = 5;

export function useLyrics(enabled) {
  const currentSong = usePlayerStore((state) => state.currentSong);
  const { audioRef, activeAudioRef, fadingRef } = usePlayer();

  const offset = usePlayerStore((s) => s.lyricsOffset);
  const setOffset = usePlayerStore((s) => s.setLyricsOffset);
  const setLyricsLines = usePlayerStore((s) => s.setLyricsLines);
  const setLyricsStatus = usePlayerStore((s) => s.setLyricsStatus);
  const lines = usePlayerStore((s) => s.lyricsLines);
  const status = usePlayerStore((s) => s.lyricsStatus);

  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFading, setIsFading] = useState(false);

  const rafRef = useRef(null);
  const abortRef = useRef(null);
  const previousSongId = useRef(currentSong?.id ?? null);
  const restartSignal = usePlayerStore((s) => s.restartSignal);

  // ── Reset quando a música muda (UMA VEZ SÓ) ──
  useEffect(() => {
    const songId = currentSong?.id;
    if (songId && songId !== previousSongId.current) {
      setOffset(0);
      previousSongId.current = songId;
      setActiveIndex(-1);
    }
  }, [currentSong?.id, setOffset]);

  // ── Busca da letra ──
  useEffect(() => {
    abortRef.current?.abort();

    if (!enabled) {
      setLyricsStatus("idle");
      setActiveIndex(-1);
      return;
    }

    const { title, artist, path: filePath, duration, id } = currentSong ?? {};

    if (!title) {
      setLyricsLines([]);
      setActiveIndex(-1);
      setLyricsStatus("notfound");
      return;
    }

    // Sempre reseta a posição ao (re)iniciar a música
    setActiveIndex(-1);

    if (
      lastFetchedSongId === id &&
      (status === "found" || status === "notfound")
    ) {
      // Letra já está no store, só resetou o índice acima — pode sair
      return;
    }

    lastFetchedSongId = id;
    setLyricsLines([]);
    setLyricsStatus("loading");

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchLyrics(title, artist, filePath, duration, ctrl.signal)
      .then((parsed) => {
        if (!parsed.length) setLyricsStatus("notfound");
        else {
          setLyricsLines(parsed);
          setLyricsStatus("found");
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error(err);
          setLyricsStatus("error");
        }
      });

    return () => ctrl.abort();
  }, [enabled, currentSong, restartSignal]); // ← adicionar restartSignal

  // ── Sincronização por RAF ──
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (!enabled) return;

    const tick = () => {
      const el = activeAudioRef?.current ?? audioRef?.current;
      if (!el || el.readyState < 2 || !lines.length) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      setIsFading(fadingRef?.current ?? false);

      const currentTime = el.currentTime + offset;
      let idx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].time <= currentTime) idx = i;
        else break;
      }

      // Lógica de gap: só entra em instrumental se estiver bem depois da última linha
      if (idx >= 0) {
        const nextTime =
          idx + 1 < lines.length ? lines[idx + 1].time : Infinity;
        const gap = nextTime - lines[idx].time;
        const elapsed = currentTime - lines[idx].time;

        // Só considera gap se a próxima linha estiver realmente longe (> MIN_GAP_SECONDS)
        // e já tiver passado pelo menos MIN_GAP_SECONDS desde o início da linha atual
        // (evita que uma linha demorada seja tratada como instrumental prematuramente)
        if (gap > MIN_GAP_SECONDS && elapsed > MIN_GAP_SECONDS) {
          idx = -1;
        }
      }

      setActiveIndex((prev) => (prev !== idx ? idx : prev));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, lines, audioRef, activeAudioRef, fadingRef, offset]);

  const isGap = lines.length > 0 && activeIndex === -1 && status === "found";

  return {
    lines,
    activeIndex,
    status,
    isFading,
    currentLine: lines[activeIndex] ?? null,
    nextLine:
      activeIndex >= 0 && activeIndex + 1 < lines.length
        ? lines[activeIndex + 1]
        : null,
    isGap,
    offset,
    setOffset,
  };
}
