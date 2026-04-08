const { app, BrowserWindow, ipcMain, Menu, screen } = require('electron');
const path = require('path');
const https = require('https');

const isDev = !app.isPackaged;

let mainWindow = null;
let notifWindow = null;
let isQuitting = false;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

function focusMainWindow() {
  if (!mainWindow || isQuitting) return;
  if (mainWindow.isDestroyed()) return;

  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();

  mainWindow.focus();
}

function destroyWindowSafe(win) {
  try {
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
  } catch {}
}

function shutdownApp() {
  if (isQuitting) return;
  isQuitting = true;

  destroyWindowSafe(notifWindow);
  destroyWindowSafe(mainWindow);

  notifWindow = null;
  mainWindow = null;

  setTimeout(() => {
    app.exit(0);
  }, 150);
}

function sendFullscreenState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(
    'window-fullscreen-changed',
    mainWindow.isFullScreen()
  );
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 900,
    minWidth: 1200,
    minHeight: 750,
    center: true,
    frame: false,
    show: false,
    icon: path.join(__dirname, '../assets/STALK.ico'),
    backgroundColor: '#111111',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev
    }
  });

  Menu.setApplicationMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow || mainWindow.isDestroyed() || isQuitting) return;
    mainWindow.show();
    sendFullscreenState();
  });

  mainWindow.on('enter-full-screen', () => {
    sendFullscreenState();
  });

  mainWindow.on('leave-full-screen', () => {
    sendFullscreenState();
  });

  mainWindow.on('close', () => {
    isQuitting = true;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createNotifWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  notifWindow = new BrowserWindow({
    width: 300,
    height: 80,
    x: width - 320,
    y: height - 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  notifWindow.loadFile(path.join(__dirname, 'notification.html'));

  notifWindow.on('closed', () => {
    notifWindow = null;
  });
}

function nightSearchRequest({ method, endpoint, apiKey, body = null }) {
  return new Promise((resolve) => {
    const dataString = body ? JSON.stringify(body) : null;

    const options = {
      hostname: 'nightsearch.life',
      port: 443,
      path: endpoint,
      method,
      headers: {
        'X-API-Key': String(apiKey || '').trim(),
        'Accept': 'application/json'
      },
      timeout: 15000
    };

    if (dataString) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = https.request(options, (res) => {
      let rawData = '';

      res.on('data', (chunk) => {
        rawData += chunk;
      });

      res.on('end', () => {
        let parsed = null;

        try {
          parsed = rawData ? JSON.parse(rawData) : null;
        } catch {
          parsed = null;
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          resolve({
            ok: false,
            status: res.statusCode,
            error:
              parsed?.message ||
              parsed?.error ||
              rawData ||
              `Ошибка NightSearch (${res.statusCode})`,
            data: parsed
          });
          return;
        }

        resolve({
          ok: true,
          status: res.statusCode,
          data: parsed
        });
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });

    req.on('error', (error) => {
      resolve({
        ok: false,
        error: error?.message || 'Network error'
      });
    });

    if (dataString) {
      req.write(dataString);
    }

    req.end();
  });
}

if (gotTheLock) {
  app.on('second-instance', () => {
    if (isQuitting) return;
    focusMainWindow();
  });

  app.whenReady().then(() => {
    createWindow();
    createNotifWindow();

    app.on('activate', () => {
      if (isQuitting) return;

      if (BrowserWindow.getAllWindows().length === 0 || !mainWindow) {
        createWindow();
        createNotifWindow();
      } else {
        focusMainWindow();
      }
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
    destroyWindowSafe(notifWindow);
    notifWindow = null;
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      shutdownApp();
    }
  });
}

ipcMain.on('window-minimize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  shutdownApp();
});

ipcMain.on('window-toggle-fullscreen', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
});

ipcMain.on('window-exit-fullscreen', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isFullScreen()) {
    mainWindow.setFullScreen(false);
  }
});

ipcMain.handle('window-is-fullscreen', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  return mainWindow.isFullScreen();
});

/* =========================
   NightSearch API handlers
   ========================= */

ipcMain.handle('nightsearch:status', async (_event, apiKey) => {
  const key = String(apiKey || '').trim();

  if (!key) {
    return {
      ok: false,
      error: 'API ключ отсутствует'
    };
  }

  return await nightSearchRequest({
    method: 'GET',
    endpoint: '/api/status',
    apiKey: key
  });
});

ipcMain.handle('nightsearch:search', async (_event, payload) => {
  const apiKey = String(payload?.apiKey || '').trim();
  const query = String(payload?.query || '').trim();
  const searchType = String(payload?.searchType || '').trim();

  if (!apiKey) {
    return {
      ok: false,
      error: 'API ключ отсутствует'
    };
  }

  if (!query) {
    return {
      ok: false,
      error: 'Пустой запрос'
    };
  }

  if (!searchType) {
    return {
      ok: false,
      error: 'Не указан тип поиска'
    };
  }

  return await nightSearchRequest({
    method: 'POST',
    endpoint: '/api/search',
    apiKey,
    body: {
      query,
      search_type: searchType
    }
  });
});