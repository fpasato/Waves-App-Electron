import { createRequire } from "module";
import * as youtube from "youtube-search-api";
import path from "path";
import os from "os";
import fs from "fs";
import { getUserProfile } from "./userProfile.js";

const searchCache = new Map();

const require = createRequire(import.meta.url);
const YTDlpWrapModule = require("yt-dlp-wrap");
const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule;

const ytDlp = new YTDlpWrap();

const cookiesPath = path.join(
  os.homedir(),
  "AppData",
  "Roaming",
  "meu-projeto",
  "cookies.txt",
);

// Monta flags de autenticação: prefere cookies.txt se existir e não estiver vazio,
// senão cai para --cookies-from-browser chrome (não expira, não precisa exportar manualmente)
function getAuthFlags() {
  try {
    const stat = fs.statSync(cookiesPath);
    if (stat.size > 100) {
      return ["--cookies", cookiesPath];
    }
  } catch {
    // arquivo não existe
  }
  return ["--cookies-from-browser", "chrome"];
}

// Flags base usados em todos os comandos yt-dlp
function baseFlags() {
  return [
    "--no-playlist",
    "--js-runtimes", "node",
    ...getAuthFlags(),
  ];
}

export async function getAudioUrl(videoId) {
  try {
    console.log("🔍 getAudioUrl chamado para:", videoId);

    const audioUrl = await ytDlp.execPromise([
      `https://www.youtube.com/watch?v=${videoId}`,
      "--get-url",
      "-f", "bestaudio[ext=webm]/bestaudio/best",
      ...baseFlags(),
    ]);

    const trimmed = audioUrl.trim().split("\n")[0];
    console.log("✅ URL obtida:", trimmed);
    return trimmed;
  } catch (error) {
    console.error("❌ Erro em getAudioUrl:", error);
    throw error;
  }
}

export async function getVideoUrl(videoId, formatId) {
  try {
    const format = formatId ? formatId : "22/18/best[ext=mp4]";

    const output = await ytDlp.execPromise([
      `https://www.youtube.com/watch?v=${videoId}`,
      "--get-url",
      "-f", format,
      ...baseFlags(),
    ]);

    const url = output.trim().split("\n")[0];
    console.log("VIDEO URL:", url);

    return { videoUrl: url, audioUrl: null };
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function getVideoFormats(videoId) {
  try {
    const output = await ytDlp.execPromise([
      `https://www.youtube.com/watch?v=${videoId}`,
      "--dump-json",
      ...baseFlags(),
    ]);

    const data = JSON.parse(output);
    const formats = (data.formats || [])
      .filter(
        (f) =>
          f.vcodec !== "none" &&
          f.acodec !== "none" &&
          f.height &&
          f.ext === "mp4" &&
          f.protocol !== "m3u8_native" &&
          f.protocol !== "m3u8" &&
          !String(f.format_note || "").includes("HLS"),
      )
      .map((f) => ({
        id: f.format_id,
        resolution: `${f.height}p`,
        ext: f.ext,
        filesize: f.filesize || null,
      }))
      .sort((a, b) => parseInt(b.resolution) - parseInt(a.resolution));

    const seen = new Set();
    const result = formats.filter((f) => {
      if (seen.has(f.resolution)) return false;
      seen.add(f.resolution);
      return true;
    });

    console.log("Formatos progressivos:", result);
    return result;
  } catch (err) {
    console.error("❌ getVideoFormats erro:", err.message);
    return [];
  }
}

export async function searchYoutube(query, forceRefresh = false, rawQuery = false) {
  const profile = getUserProfile();
  let finalQuery = query;

  if (!rawQuery) {
    if (!query || query.trim() === "") {
      finalQuery = profile.topArtists[0] || "música";
    }
  }

  const cacheKey = finalQuery;
  if (!forceRefresh && searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  try {
    const first = await youtube.GetListByKeyword(finalQuery, false, 10);
    let items = [...first.items];

    // NextPage pode falhar — captura o erro sem derrubar a busca inteira
    try {
      if (first.nextPage) {
        const second = await youtube.NextPage(first.nextPage);
        items = [...items, ...second.items];

        if (second?.nextPage) {
          const third = await youtube.NextPage(second.nextPage);
          items = [...items, ...third.items];
        }
      }
    } catch (pageErr) {
      console.warn("⚠️ NextPage falhou, usando só primeira página:", pageErr.message);
    }

    const result = items.slice(0, 30).map((item) => {
      const titleParts = (item.title || "").split(" - ");
      const artistFromTitle = titleParts.length > 1 ? titleParts[0].trim() : null;

      const channel =
        artistFromTitle ||
        item.channelTitle ||
        item.channel ||
        item.shortBylineText ||
        item.title ||
        "Desconhecido";

      return {
        id: item.id,
        title: item.title,
        thumbnail: item.thumbnail?.thumbnails?.[0]?.url || "",
        channel,
        duration: item.length?.simpleText || "Unknown",
      };
    });

    searchCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(error);
    return [];
  }
}