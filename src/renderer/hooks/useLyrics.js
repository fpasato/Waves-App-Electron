import { useState, useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "../store/playerStore";
import { shallow } from "zustand/shallow";

/* ================================================================== */
/*  Constantes e funções de limpeza (inalteradas)                      */
/* ================================================================== */

const LRCLIB_BASE = "https://lrclib.net/api";
const DURATION_TOLERANCE = 10;

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
      if (diff > DURATION_TOLERANCE && i < attempts.length - 1) continue;

      const parsed = parseLRC(best.syncedLyrics);
      if (!parsed.length) continue;

      return parsed;
    } catch (err) {
      if (err.name === "AbortError") throw err;
    }
  }
  return [];
}

/* ================================================================== */
/*  Hook useLyrics – busca e expõe apenas os dados necessários         */
/* ================================================================== */

export function useLyrics(enabled) {
  // Extrai apenas os campos necessários, evitando re-renderizações desnecessárias
  const title = usePlayerStore((s) => s.currentSong?.title);
  const artist = usePlayerStore((s) => s.currentSong?.artist);
  const filePath = usePlayerStore((s) => s.currentSong?.path);
  const duration = usePlayerStore((s) => s.currentSong?.duration);
  const songId = usePlayerStore((s) => s.currentSong?.id);
  const offset = usePlayerStore((s) => s.lyricsOffset);
  const setOffset = usePlayerStore((s) => s.setLyricsOffset);

  const [lines, setLines] = useState([]);
  const [status, setStatus] = useState("idle"); // idle|loading|found|notfound|error

  const fetchControllerRef = useRef(null);
  const lastFetchedIdRef = useRef(null);

  const abortFetch = useCallback(() => {
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
      fetchControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !songId || !title) {
      setLines([]);
      setStatus("notfound");
      abortFetch();
      return;
    }

    // Se já buscamos para este id, não repete
    if (lastFetchedIdRef.current === songId && (status === "found" || status === "notfound")) {
      return;
    }

    abortFetch();
    setLines([]);
    setStatus("loading");
    lastFetchedIdRef.current = songId;

    const ctrl = new AbortController();
    fetchControllerRef.current = ctrl;

    fetchLyrics(title, artist, filePath, duration, ctrl.signal)
      .then((parsed) => {
        if (ctrl.signal.aborted) return;
        if (parsed.length) {
          setLines(parsed);
          setStatus("found");
        } else {
          setStatus("notfound");
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("[useLyrics] Erro ao buscar letra:", err);
        setStatus("error");
      });

    return () => {
      abortFetch();
    };
  }, [enabled, songId, title, artist, filePath, duration]);

  // Limpa quando desabilitado
  useEffect(() => {
    if (!enabled) {
      abortFetch();
      setLines([]);
      setStatus("idle");
    }
  }, [enabled]);

  const setOffsetStable = useCallback(
    (value) => setOffset(value),
    [setOffset]
  );

  return {
    lines,
    status,
    offset,
    setOffset: setOffsetStable,
  };
}