import * as mm from "music-metadata";
import { readdirSync, statSync } from "fs";
import { join } from "path"; // ← importação adicionada
import { pathToFileURL } from "node:url";

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".flac", ".ogg", ".m4a"];

// Função assíncrona para ler duração de um arquivo (não utilizada diretamente)
async function getAudioDuration(filePath) {
  try {
    const metadata = await mm.parseFile(filePath);
    return metadata.format.duration || 0;
  } catch (err) {
    console.error(`Erro ao ler metadados de ${filePath}:`, err);
    return 0;
  }
}

function parseArtistTitleFromFilename(filename) {
  // 1. Remove extensão
  let name = filename.replace(/\.[^/.]+$/, "");

  // 2. Remove sufixos de plataforma/qualidade comuns no final
  name = name
    .replace(/\s*[-–]\s*(official\s*)?(music\s*)?video\s*$/i, "")
    .replace(/\s*[-–]\s*official\s*(audio|lyric[s]?)\s*$/i, "")
    .replace(
      /\s*\([^)]*(?:youtube|vevo|7clouds|lyrics?|official|hd|hq|4k|320\s*kbps)[^)]*\)\s*$/gi,
      "",
    )
    .replace(
      /\s*\[[^\]]*(?:youtube|vevo|official|hd|hq|4k|320\s*kbps)[^\]]*\]\s*$/gi,
      "",
    )
    .replace(/\s*[-–]\s*\d{4}\s*(?:remaster(?:ed)?|version)?\s*$/i, "") // "- 2024 Remastered"
    .replace(/\s*[🎵♪♫✨🔥💿🎶]+\s*/g, " ") // emojis musicais
    .replace(/\s{2,}/g, " ")
    .trim();

  // 3. Tenta separar por " - "
  const parts = name
    .split(/\s+[-–]\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 1) {
    // Tenta separar por ":" como fallback ("Artist: Title")
    const colonParts = name
      .split(/:(.+)/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (colonParts.length >= 2) {
      return { artist: colonParts[0], title: colonParts[1] };
    }
    return { artist: "Desconhecido", title: parts[0] };
  }

  // 4. Com mais de 2 partes, junta tudo exceto o primeiro como título
  // ex: "Artist - Title - Remix Version" → artist: Artist, title: Title - Remix Version
  const candidate0 = parts[0];
  const candidate1 = parts.slice(1).join(" - ");

  // 5. Pontuação
  const TITLE_HINTS = [
    /\blyrics?\b/i,
    /\bofficial\b/i,
    /\bvideo\b/i,
    /\bclip\b/i,
    /\bremix\b/i,
    /\bcover\b/i,
    /\blive\b/i,
    /\bacoustic\b/i,
    /\baudio\b/i,
    /\bfeat\.?\b/i,
    /\bft\.?\b/i,
    /\bslowed\b/i,
    /\breverb\b/i,
    /\bsped[\s_]up\b/i,
    /\bversion\b/i,
    /\bedit\b/i,
    /\bremaster(?:ed)?\b/i,
    /\binstrumental\b/i,
    /\bkaraoke\b/i,
  ];

  const ARTIST_HINTS = [
    /\bVEVO$/i, // canais VEVO geralmente são artistas
    /^MC\s/i,
    /^DJ\s/i,
    /^The\s/i,
  ];

  function titleScore(str) {
    let score = 0;
    for (const r of TITLE_HINTS) if (r.test(str)) score += 3;
    // parênteses/colchetes indicam versão/feat = parte do título
    score += (str.match(/\([^)]+\)/g) ?? []).length * 2;
    score += (str.match(/\[[^\]]+\]/g) ?? []).length * 2;
    // strings longas tendem a ser títulos com descrição
    if (str.length > 50) score += 2;
    return score;
  }

  function artistScore(str) {
    let score = 0;
    // sem parênteses → mais provável ser artista
    if (!/[([)]/.test(str)) score += 3;
    // curto → mais provável ser artista
    if (str.length <= 25) score += 2;
    else if (str.length <= 40) score += 1;
    // palavras capitalizadas consistentemente → nome de artista
    const words = str.trim().split(/\s+/);
    const allCapped = words.every(
      (w) =>
        w.length === 0 ||
        /^[A-ZÀ-Ú0-9]/.test(w) ||
        /^(de|da|do|e|&|feat|ft)$/i.test(w),
    );
    if (allCapped && words.length >= 1) score += 2;
    // hints explícitos de artista
    for (const r of ARTIST_HINTS) if (r.test(str)) score += 3;
    // penaliza se tem hints de título
    score -= titleScore(str);
    return score;
  }

  const score0asArtist = artistScore(candidate0);
  const score1asArtist = artistScore(candidate1);

  if (score1asArtist > score0asArtist) {
    return { artist: candidate1, title: candidate0 };
  }

  return { artist: candidate0, title: candidate1 };
}

export async function scanFolder(folderPath) {
  const results = [];
  try {
    const entries = readdirSync(folderPath);

    for (const entry of entries) {
      const fullPath = join(folderPath, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) continue;

      const ext = entry.slice(entry.lastIndexOf(".")).toLowerCase();

      if (AUDIO_EXTENSIONS.includes(ext)) {
        try {
          const metadata = await mm.parseFile(fullPath, {
            skipCovers: true,
            native: true,
          });

          const duration = metadata.format.duration || 0;
          const common = metadata.common;

          let artista = "Desconhecido";
          let titulo = entry.replace(/\.[^/.]+$/, "");

          if (common.artist) {
            artista = Array.isArray(common.artist)
              ? common.artist[0]
              : common.artist;
          }

          if (common.title) {
            titulo = common.title;
          }

          if (artista === "Desconhecido" || !common.title) {
            const { artist: parsedArtist, title: parsedTitle } =
              parseArtistTitleFromFilename(entry);

            if (parsedArtist !== "Desconhecido") artista = parsedArtist;
            if (parsedTitle) titulo = parsedTitle;
          }

          results.push({
            id: fullPath,
            path: fullPath,
            title: titulo,
            artist: artista,
            duration,
            src: pathToFileURL(fullPath).href,
            cover: null,
          });
        } catch (err) {
          console.error(`Erro ao processar ${fullPath}:`, err);
        }
      }
    }
  } catch (e) {
    console.error("Erro ao escanear pasta:", e);
  }
  return results;
}
