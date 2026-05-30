// src/main/handlers/authHandlers.js
import { ipcMain, BrowserWindow, session } from 'electron';

export function registerAuthHandlers() {
  ipcMain.handle('google:login-external', async () => {
    return new Promise((resolve) => {
      const loginWin = new BrowserWindow({
        width: 500,
        height: 680,
        title: 'Entrar com Google',
        webPreferences: {
          partition: 'persist:google-login',
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      loginWin.loadURL('https://accounts.google.com/ServiceLogin?service=youtube');

      const targetSession = session.fromPartition('persist:google-login');

      const cookieCheck = setInterval(async () => {
        const cookies = await targetSession.cookies.get({ domain: '.google.com' });
        const loggedIn = cookies.some(
          (c) => c.name === 'SID' || c.name === 'SSID' || c.name === 'HSID'
        );
        if (loggedIn) {
          clearInterval(cookieCheck);
          loginWin.close();
          resolve(true);
        }
      }, 1500);

      loginWin.on('closed', () => {
        clearInterval(cookieCheck);
        resolve(false);
      });
    });
  });

  ipcMain.handle('google:import-cookies', async () => {
    const loginSession = session.fromPartition('persist:google-login');
    const youtubeSession = session.fromPartition('persist:youtube');
    const domains = ['.youtube.com', '.google.com', 'accounts.google.com'];

    let total = 0;
    for (const domain of domains) {
      const cookies = await loginSession.cookies.get({ domain });
      console.log(`🍪 [${domain}] encontrados: ${cookies.length} cookies`);

      for (const cookie of cookies) {
        if (cookie.name.startsWith('__Host-') || cookie.name.startsWith('__Secure-')) continue;

        try {
          await youtubeSession.cookies.set({
            url: `https://${cookie.domain.replace(/^\./, '')}`,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            expirationDate: cookie.expirationDate,
          });
          total++;
        } catch (err) {
          console.warn(`⚠️ Cookie ignorado [${cookie.name}]:`, err.message);
        }
      }
    }

    console.log(`✅ Total de cookies copiados: ${total}`);
    return true;
  });

  ipcMain.handle('google:logout', async () => {
    const youtubeSession = session.fromPartition('persist:youtube');
    await youtubeSession.clearStorageData({
      storages: ['cookies', 'localstorage', 'sessionstorage', 'cachestorage'],
    });
    return true;
  });
}