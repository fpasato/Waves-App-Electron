// src/main/handlers/youtubeHandlers.js
import { ipcMain } from 'electron';


export function registerYoutubeHandlers({ ytDlp, ffmpegPath, baseFlags, searchYoutube }) {
  
  ipcMain.handle('youtube:search', async (_, query, forceRefresh = false, rawQuery = false) => {
    return searchYoutube(query, forceRefresh, rawQuery);
  });

  ipcMain.handle('youtube:getVideoFormats', async (_, videoId) => {
    console.log('IPC getVideoFormats recebido:', videoId);
    try {
      const output = await ytDlp.execPromise([
        `https://www.youtube.com/watch?v=${videoId}`,
        '--dump-json',
        ...baseFlags(),
      ]);

      const data = JSON.parse(output);
      const formats = data.formats || [];
      const videoMap = new Map();

      const video = formats
        .filter(f =>
          f.vcodec !== 'none' && f.height && f.ext &&
          f.protocol !== 'm3u8' && f.protocol !== 'm3u8_native'
        )
        .map(f => ({
          id: f.format_id,
          height: f.height,
          resolution: `${f.height}p`,
          ext: f.ext,
          vcodec: f.vcodec,
          acodec: f.acodec,
          filesize: f.filesize || null,
          fps: f.fps || null,
          tbr: f.tbr || 0,
        }))
        .sort((a, b) => b.tbr - a.tbr)
        .reduce((acc, f) => {
          if (!videoMap.has(f.height)) {
            videoMap.set(f.height, f);
            acc.push(f);
          }
          return acc;
        }, []);

      const audio = formats
        .filter(f => f.vcodec === 'none' && f.acodec !== 'none')
        .map(f => ({
          id: f.format_id,
          ext: f.ext,
          abr: f.abr || 0,
          filesize: f.filesize || null,
        }))
        .sort((a, b) => b.abr - a.abr);

      return { video, audio };
    } catch (err) {
      console.error('getVideoFormats erro:', err);
      return { video: [], audio: [] };
    }
  });

  // download:audio e download:video removidos daqui —
  // estão em handlers/downloads.js com suporte a progresso
}