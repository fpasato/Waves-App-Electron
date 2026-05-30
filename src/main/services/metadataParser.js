// services/metadataParser.js
import { parseFile } from "music-metadata";
import path from "path";
import {
  cleanArtist,
  cleanFull,
  splitArtistTitle,
  removeYoutubeChannel,
  removeEmojis,
} from "../../renderer/src/lib/titleUtils";

export async function extractTitleArtist(filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));

  try {
    const metadata = await parseFile(filePath);
    const duration = metadata.format.duration || 0;
    return { ...parseFromFilename(fileName), duration };
  } catch (err) {
    console.warn(`⚠️ Falha ao ler metadados de ${filePath}:`, err.message);
    return { ...parseFromFilename(fileName), duration: 0 };
  }
}

function parseFromFilename(fileName) {
  const cleaned = removeYoutubeChannel(
    fileName
      .replace(/\.[^.]+$/, "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

  const split = splitArtistTitle(cleaned);
  if (split) {
    const artist = cleanArtist(split.artist);
    const title = cleanFull(split.title);

    // título ficou vazio após limpeza (ex: era só "[COM GRAVE]")
    // usa o nome inteiro como título e Unknown Artist
    if (!title) {
      return {
        title: cleanFull(split.artist) || cleaned,
        artist: "Unknown Artist",
      };
    }

    if (artist && title) return { artist, title };
  }
  return {
    title: cleanFull(cleaned),
    artist: "Unknown Artist",
  };
}
