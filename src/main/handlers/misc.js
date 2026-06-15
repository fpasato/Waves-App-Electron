import { ipcMain, app, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { scanFolder } from '../services/musicService.js';
import { extractTitleArtist } from '../services/metadataParser.js';

function remuxWebm(inputPath, outputPath, ffmpegPath) {
  return new Promise((resolve, reject) => {
    execFile(
      ffmpegPath,
      ['-i', inputPath, '-c', 'copy', outputPath],
      (error) => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
}

export function registerMiscHandlers() {
  ipcMain.on('ping', () => console.log('pong'));

  ipcMain.handle('dialog:selectFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    return canceled ? null : filePaths[0];
  });

  ipcMain.handle('music:scanFolder', async (_, folderPath) => {
    return scanFolder(folderPath);
  });

  ipcMain.handle('radio:saveRecording', async (_, { buffer, radioName }) => {
    const docsPath = app.getPath('documents');
    const saveDir = path.join(docsPath, 'Waves', 'gravações de radio');
    fs.mkdirSync(saveDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = radioName.replace(/[/\\?%*:|"<>]/g, '_');

    const rawPath = path.join(saveDir, `${safeName}_${timestamp}_raw.webm`);
    const finalPath = path.join(saveDir, `${safeName}_${timestamp}.webm`);

    fs.writeFileSync(rawPath, Buffer.from(buffer));

    try {
      let ffmpegPath = 'ffmpeg';
      try {
        ffmpegPath = (await import('ffmpeg-static')).default ?? 'ffmpeg';
      } catch { /* usa o ffmpeg do sistema */ }

      await remuxWebm(rawPath, finalPath, ffmpegPath);
      fs.unlinkSync(rawPath);
      return finalPath;
    } catch (err) {
      console.warn('ffmpeg remux falhou, retornando arquivo raw:', err.message);
      fs.renameSync(rawPath, finalPath);
      return finalPath;
    }
  });
}