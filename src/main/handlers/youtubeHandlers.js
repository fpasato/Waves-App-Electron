// src/main/handlers/youtubeHandlers.js
import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs';

/**
 * Registra handlers de YouTube (busca, formatos, download simples).
 * @param {object} deps
 * @param {object} deps.ytDlp - Instância do YTDlpWrap
 * @param {string} deps.ffmpegPath - Caminho do ffmpeg estático
 * @param {function} deps.baseFlags - Função que retorna array de flags base
 * @param {function} deps.searchYoutube - Função externa que realiza a busca (deve ser injetada)
 */
export function registerYoutubeHandlers({ ytDlp, ffmpegPath, baseFlags, searchYoutube }) {
  // youtube:search – depende da função searchYoutube (implementada onde você quiser)
  ipcMain.handle('youtube:search', async (_, query, forceRefresh = false, rawQuery = false) => {
    return searchYoutube(query, forceRefresh, rawQuery);
  });

  // youtube:getVideoFormats
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
        .filter(
          (f) =>
            f.vcodec !== 'none' &&
            f.height &&
            f.ext &&
            f.protocol !== 'm3u8' &&
            f.protocol !== 'm3u8_native'
        )
        .map((f) => ({
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
        .filter((f) => f.vcodec === 'none' && f.acodec !== 'none')
        .map((f) => ({
          id: f.format_id,
          ext: f.ext,
          abr: f.abr || 0,
          filesize: f.filesize || null,
        }))
        .sort((a, b) => b.abr - a.abr);

      return { video, audio };
    } catch (err) {
      console.error('❌ getVideoFormats erro:', err);
      return { video: [], audio: [] };
    }
  });

  // download:audio (simples, sem progresso)
  ipcMain.handle('download:audio', async (_, { videoId, title }) => {
    try {
      const savePath = path.join(app.getPath('documents'), 'Vibe', 'audios');
      fs.mkdirSync(savePath, { recursive: true });
      const safeTitle = (title ?? 'audio').replace(/[<>:"/\\|?*]/g, '').trim();
      const filePath = path.join(savePath, `${safeTitle}.mp3`);

      await ytDlp.execPromise([
        `https://www.youtube.com/watch?v=${videoId}`,
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--ffmpeg-location', ffmpegPath,
        '-o', filePath,
        ...baseFlags(),
      ]);

      return { success: true, path: filePath };
    } catch (err) {
      console.error('❌ download:audio erro:', err);
      return { success: false, error: err.message };
    }
  });

  // download:video (simples)
  ipcMain.handle('download:video', async (_, { videoId, title, formatId }) => {
    try {
      const savePath = path.join(app.getPath('documents'), 'Vibe', 'video');
      fs.mkdirSync(savePath, { recursive: true });
      const safeTitle = (title ?? 'video').replace(/[<>:"/\\|?*]/g, '').trim();
      const filePath = path.join(savePath, `${safeTitle}.mp4`);

      await ytDlp.execPromise([
        `https://www.youtube.com/watch?v=${videoId}`,
        '-f', `${formatId}+bestaudio[ext=m4a]/${formatId}+bestaudio/best`,
        '--merge-output-format', 'mp4',
        '--ffmpeg-location', ffmpegPath,
        '-o', filePath,
        ...baseFlags(),
      ]);

      return { success: true, path: filePath };
    } catch (err) {
      console.error('❌ download:video erro:', err);
      return { success: false, error: err.message };
    }
  });
}