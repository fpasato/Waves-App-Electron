// src/main/adblocker.js
import { session, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { ElectronBlocker } from '@ghostery/adblocker-electron';
import fetch from 'cross-fetch';

let adblockerInitialized = false;

export async function setupAdBlocker(userAgent, youtubePartition) {
  if (adblockerInitialized) return;
  adblockerInitialized = true;

  const cachePath = path.join(app.getPath('userData'), 'adblocker-cache.bin');

  const filterLists = [
    'https://easylist.to/easylist/easylist.txt',
    'https://easylist.to/easylist/easyprivacy.txt',
    'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
    'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters-2023.txt',
    'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt',
    'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt',
    'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt',
  ];

  const blocker = await ElectronBlocker.fromLists(fetch, filterLists, {
    path: cachePath,
    read: fs.promises.readFile,
    write: fs.promises.writeFile,
    enableCompression: true,
  });

  session.defaultSession.setUserAgent(userAgent);
  const youtubeSession = session.fromPartition(youtubePartition);
  youtubeSession.setUserAgent(userAgent);

  youtubeSession.webRequest.onBeforeRequest((details, callback) => {
    const url = new URL(details.url);
    const hostname = url.hostname;

    const whitelistedDomains = [
      'youtube.com', 'youtube-nocookie.com', 'google.com', 'googleapis.com',
      'gstatic.com', 'googlevideo.com', 'ytimg.com', 'ggpht.com',
      'googleusercontent.com', 'youtu.be',
    ];

    if (whitelistedDomains.some(domain => hostname.endsWith(domain))) {
      return callback({ cancel: false });
    }

    try {
      const { match } = blocker.match({
        url: details.url,
        type: details.resourceType,
        isFirstParty: false,
      });
      callback({ cancel: match });
    } catch {
      callback({ cancel: false });
    }
  });

  youtubeSession.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({
      requestHeaders: {
        ...details.requestHeaders,
        'User-Agent': userAgent,
        'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
      },
    });
  });

  console.log('✅ Adblocker ativo');
}