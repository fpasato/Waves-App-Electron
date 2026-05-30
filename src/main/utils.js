// src/main/utils.js
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import ffmpegStatic from 'ffmpeg-static';
import { createRequire } from 'module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const YTDlpWrapModule = require('yt-dlp-wrap');
const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule;

// ─── Constantes ─────────────────────────────────────────────
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const YOUTUBE_PARTITION = 'persist:youtube';

export const ytDlpPath = path.join(
  app.getPath('userData'),
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
);

export const ffmpegPath = ffmpegStatic;

export const cookiesPath = path.join(
  os.homedir(),
  'AppData',
  'Roaming',
  'meu-projeto',
  'cookies.txt'
);

// Instância única do yt-dlp (compartilhada)
export const ytDlp = new YTDlpWrap(ytDlpPath);

// ─── Auth flags ─────────────────────────────────────────────
export function getAuthFlags() {
  try {
    const stat = fs.statSync(cookiesPath);
    if (stat.size > 100) return ['--cookies', cookiesPath];
  } catch {
    // arquivo não existe
  }
  return ['--cookies-from-browser', 'chrome'];
}

export function baseFlags() {
  return ['--no-playlist', '--js-runtimes', 'node', ...getAuthFlags()];
}

// ─── Download/verificação do yt-dlp ─────────────────────────
export async function ensureYtDlp() {
  if (fs.existsSync(ytDlpPath)) {
    console.log('✅ yt-dlp já existe:', ytDlpPath);
    return ytDlpPath;
  }

  try {
    await YTDlpWrap.downloadFromGithub(ytDlpPath);
    console.log('✅ yt-dlp baixado:', ytDlpPath);
  } catch (err) {
    console.warn('❌ Erro ao baixar yt-dlp:', err);
  }

  return ytDlpPath;
}

// ─── Helper para músicas ────────────────────────────────────
export function withAudioSrc(row) {
  if (!row?.path) return row;
  return { ...row, src: pathToFileURL(row.path).href };
}