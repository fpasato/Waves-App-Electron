import { createRequire } from "module";
import * as youtube from "youtube-search-api";
import path from "path";
import os from "os";
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

export async function getAudioUrl(videoId) {
  try {
    console.log("🔍 getAudioUrl chamado para:", videoId);

    const audioUrl = await ytDlp.execPromise([
      `https://www.youtube.com/watch?v=${videoId}`,
      "--get-url",
      "-f",
      "bestaudio[ext=webm]/bestaudio/best",
      "--no-playlist",
      "--cookies",
      cookiesPath,
      "--js-runtimes",
      "node",
    ]);

    const trimmed = audioUrl.trim().split("\n")[0];
    console.log("✅ URL obtida:", trimmed);
    return trimmed;
  } catch (error) {
    console.error("❌ Erro em getAudioUrl:", error);
    throw error;
  }
}

export async function searchYoutube(query, forceRefresh = false, rawQuery = false) {
  const profile = getUserProfile();
  let finalQuery = query;

  if (!rawQuery) { // 👈 só manipula se não for rawQuery
    if (!query || query.trim() === "") {
      finalQuery = profile.topArtists[0] || "música";
    } else if (query.split(" ").length <= 2 && profile.topArtists.length > 0) {
      finalQuery = `${query} ${profile.topArtists[0]}`;
    }
  }

  const cacheKey = finalQuery;
  if (!forceRefresh && searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  try {
    const first = await youtube.GetListByKeyword(finalQuery, false, 10);
    let items = [...first.items];
    let second, third;

    if (first.nextPage) {
      second = await youtube.NextPage(first.nextPage);
      items = [...items, ...second.items];
    }
    if (second?.nextPage) {
      third = await youtube.NextPage(second.nextPage);
      items = [...items, ...third.items];
    }

    let result = items.slice(0, 30).map((item) => {
      // Tenta extrair do título ("Michael Jackson - Smooth Criminal")
      const titleParts = (item.title || "").split(" - ");
      const artistFromTitle =
        titleParts.length > 1 ? titleParts[0].trim() : null;

      // Fallback em cascata: título > channelTitle > channel > "Desconhecido"
      const channel =
        artistFromTitle ||
        item.channelTitle ||
        item.channel ||
        item.shortBylineText ||
        item.title || // 👈 usa o próprio título se não tem artista
        "Desconhecido";

      return {
        id: item.id,
        title: item.title,
        thumbnail: item.thumbnail?.thumbnails?.[0]?.url || "",
        channel,
        duration: item.length?.simpleText || "Unknown",
      };
    });

    // Reordena com segurança: se não existir artists, usa objeto vazio
    const artistsMap = profile.artists || {};
    result.sort((a, b) => {
      const aScore = artistsMap[a.channel] || 0;
      const bScore = artistsMap[b.channel] || 0;
      return bScore - aScore;
    });

    searchCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(error);
    return [];
  }
}
