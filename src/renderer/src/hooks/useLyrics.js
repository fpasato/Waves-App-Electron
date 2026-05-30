import { useState, useEffect, useRef } from "react";
import { usePlayer } from "../store/PlayerContext";
import { usePlayerStore } from "../store/playerStore";

const LRCLIB_BASE = "https://lrclib.net/api";

/* ────────── Padrões de limpeza ────────── */
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

/* ────────── Funções de limpeza ────────── */
/** Remove o trecho “- Canal (youtube)” do final da string. */
function removeYoutubeChannel(str) {
  return str
    .replace(/\s*[-–][^-–]*\(youtube\)\s*$/i, "")
    .replace(/\s*\(youtube\)\s*$/i, "");
}

/** Limpa sujeira fixa e feat, mas preserva versões (slowed, remix…). */
function cleanBase(raw) {
  if (!raw) return "";
  let t = raw.trim();
  t = removeYoutubeChannel(t);
  for (const re of ALWAYS_NOISE) t = t.replace(re, "");
  for (const re of FEAT_NOISE) t = t.replace(re, "");
  return t.trim();
}

/** Limpeza completa: remove também sufixos de versão. */
function cleanFull(raw) {
  let t = cleanBase(raw);
  for (const re of VERSION_SUFFIXES) t = t.replace(re, "");
  return t.trim();
}

/** Extrai apenas o primeiro artista (antes de vírgula, “&” ou “/”). */
function cleanArtist(raw) {
  if (!raw) return "";
  let a = cleanFull(raw);
  a = a.split(/[,&/]/)[0];
  return a.trim();
}

/** Tenta extrair { artist, title } de “Artista - Título”. */
function splitArtistTitle(str) {
  const m = str.match(/^(.+?)\s*[-–]\s*(.+)$/);
  return m ? { artist: m[1].trim(), title: m[2].trim() } : null;
}

/** Nome do arquivo sem extensão. */
function getFileNameWithoutExtension(filePath) {
  if (!filePath) return null;
  const parts = filePath.split(/[\\/]/);
  const name = parts[parts.length - 1];
  const dot = name.lastIndexOf(".");
  return dot === -1 ? name : name.substring(0, dot);
}

/* ────────── Parser LRC ────────── */
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

/* ────────── Fetch e seleção ────────── */
/** Seleciona o melhor resultado com base em syncedLyrics e duração. */
function pickBest(results, targetDuration) {
  const synced = results.filter((r) => r.syncedLyrics);
  const pool = synced.length ? synced : results;

  if (!targetDuration) return pool[0] ?? null;

  return pool.reduce((best, cur) => {
    const dBest = Math.abs((best?.duration ?? Infinity) - targetDuration);
    const dCur = Math.abs((cur.duration ?? Infinity) - targetDuration);
    return dCur < dBest ? cur : best;
  }, null);
}

/**
 * Gera a lista de tentativas de busca, em ordem de confiança.
 * Agora inclui uma tentativa com artista/título trocados (para metadados invertidos).
 */

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
      const titleV = cleanBase(split.title);
      const titleF = cleanFull(split.title);

      push(titleV, artist);
      push(titleF, artist);
      push(titleF);
    }
  }

  push(cleanFull(rawTitle), cleanArtist(rawArtist));
  push(cleanFull(rawTitle));

  for (let i = 0; i < attempts.length; i++) {
    const params = attempts[i];
    const url = `${LRCLIB_BASE}/search?${new URLSearchParams(params)}`;

    try {
      const res = await fetch(url, { signal });
      if (!res.ok) continue;

      const data = await res.json();
      if (!Array.isArray(data) || !data.length) continue;

      // Ranqueia por duração — mais próximo primeiro
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

      // Rejeita se a diferença for absurda (> 10s) e ainda há tentativas restantes
      const diff = targetDuration
        ? Math.abs(best.duration - targetDuration)
        : 0;
      if (diff > 10 && i < attempts.length - 1) {
        console.log(
          `[fetchLyrics] tentativa ${i + 1}: melhor match tem diff ${diff}s, tentando próxima`,
        );
        continue;
      }

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

/* ────────── Hook principal ────────── */
export function useLyrics(enabled) {
  const currentSong = usePlayerStore((state) => state.currentSong);
  const { audioRef, activeAudioRef, fadingRef } = usePlayer();

  const [lines, setLines] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [status, setStatus] = useState("idle");
  const [isFading, setIsFading] = useState(false);
  const [offset, setOffset] = useState(0);

  const rafRef = useRef(null);
  const abortRef = useRef(null);

  /* ── Busca da letra ── */
  useEffect(() => {
    abortRef.current?.abort();

    if (!enabled) {
      setLines([]);
      setActiveIndex(-1);
      setStatus("idle");
      setIsFading(false);
      return;
    }

    const { title, artist, path: filePath, duration } = currentSong ?? {};

    if (!title) {
      setLines([]);
      setActiveIndex(-1);
      setStatus("notfound");
      return;
    }

    setLines([]);
    setActiveIndex(-1);
    setStatus("loading");

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchLyrics(title, artist, filePath, duration, ctrl.signal)
      .then((parsed) => {
        if (!parsed.length) {
          setStatus("notfound");
        } else {
          setLines(parsed);
          setStatus("found");
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error(err);
          setStatus("error");
        }
      });

    return () => ctrl.abort();
  }, [enabled, currentSong]);

  /* ── Sincronização via RAF ── */
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (!enabled) return;

    const tick = () => {
      // 🔧 Correção do delay: só sincroniza se o elemento de áudio existe e está pronto
      const el = activeAudioRef?.current ?? audioRef?.current;
      if (!el || el.readyState < 2 || !lines.length) {
        // Se ainda não estiver pronto, continua a verificação no próximo quadro
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
      setActiveIndex((prev) => (prev !== idx ? idx : prev));

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, lines, audioRef, activeAudioRef, fadingRef, offset]);

  // no return:
  return {
    lines,
    activeIndex,
    status,
    isFading,
    currentLine: lines[activeIndex] ?? null,
    nextLine: lines[activeIndex + 1] ?? null,
    offset,
    setOffset,
  };
}
