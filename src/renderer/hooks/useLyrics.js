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

  for (let i = 0; i < attempts.length; i++) {
    const url = `${LRCLIB_BASE}/search?${new URLSearchParams(attempts[i])}`;
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) continue;

      const withSynced = data.filter((r) => r.syncedLyrics);
      if (!withSynced.length) continue;

      const best = targetDuration
        ? withSynced.reduce((a, b) =>
            Math.abs(a.duration - targetDuration) <=
            Math.abs(b.duration - targetDuration)
              ? a
              : b,
          )
        : withSynced[0];

      const diff = targetDuration
        ? Math.abs(best.duration - targetDuration)
        : 0;
      if (diff > 10 && i < attempts.length - 1) continue;

      const parsed = parseLRC(best.syncedLyrics);
      if (!parsed.length) continue;

      console.log(
        `[fetchLyrics] ✅ ${best.trackName} – ${best.artistName} (diff: ${diff}s)`,
      );
      return parsed;
    } catch (err) {
      if (err.name === "AbortError") throw err;
    }
  }
  return [];
}

let lastFetchedSongId = null;

const MIN_GAP_SECONDS = 4;

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
  const previousSongId = useRef(null);

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

    if (
      lastFetchedSongId === id &&
      (status === "found" || status === "notfound")
    ) {
      return;
    }

    lastFetchedSongId = id;
    setLyricsLines([]);
    setActiveIndex(-1);
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
  }, [enabled, currentSong]);

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
    nextLine: activeIndex >= 0 && activeIndex + 1 < lines.length
      ? lines[activeIndex + 1]
      : null,
    isGap,
    offset,
    setOffset,
  };
}