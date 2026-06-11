// services/musicService.js
import { readdirSync, statSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "node:url";
import { extractTitleArtist } from "./metadataParser.js";
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".webm"];

export async function scanFolder(folderPath) {
  const results = [];
  try {
    const entries = readdirSync(folderPath);

    for (const entry of entries) {
      const fullPath = join(folderPath, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) continue;

      const ext = entry.slice(entry.lastIndexOf(".")).toLowerCase();
      if (!AUDIO_EXTENSIONS.includes(ext)) continue;

      try {
        // Agora a função já retorna title, artist e duration
        const { title, artist, duration } = await extractTitleArtist(fullPath);

        results.push({
          id: fullPath,
          path: fullPath,
          title,
          artist,
          duration,
          src: pathToFileURL(fullPath).href,
          cover: null, // pode ser extraído depois se necessário
        });
      } catch (err) {
        console.error(`Erro ao processar ${fullPath}:`, err);
      }
    }
  } catch (e) {
    console.error("Erro ao escanear pasta:", e);
  }
  return results;
}
