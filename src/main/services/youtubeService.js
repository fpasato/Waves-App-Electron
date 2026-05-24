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

export async function searchYoutube(query, forceRefresh = false) {
  const profile = getUserProfile();
  let finalQuery = query;

  if (!query || query.trim() === "") {
    if (profile.topArtists.length > 0) {
      finalQuery = profile.topArtists[0];
    } else {
      finalQuery = "música";
    }
  } else if (query.split(" ").length <= 2 && profile.topArtists.length > 0) {
    finalQuery = `${query} ${profile.topArtists[0]}`;
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

    let result = items.slice(0, 30).map((item) => ({
      id: item.id,
      title: item.title,
      thumbnail: item.thumbnail?.thumbnails?.[0]?.url || "",
      channel: item.channelTitle,
      duration: item.length?.simpleText || "Unknown",
    }));

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