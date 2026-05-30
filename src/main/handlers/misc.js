// src/main/handlers/misc.js
import { ipcMain, app, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { scanFolder } from '../services/musicService.js';

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
    const saveDir = path.join(docsPath, 'Vibe', 'gravações de radio');
    fs.mkdirSync(saveDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = radioName.replace(/[/\\?%*:|"<>]/g, '_');
    const filePath = path.join(saveDir, `${safeName}_${timestamp}.webm`);

    fs.writeFileSync(filePath, Buffer.from(buffer));
    return filePath;
  });
}