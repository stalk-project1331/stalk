const { app, BrowserWindow, ipcMain, Menu, screen, shell } = require('electron');
const path = require('path');

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
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
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

ipcMain.handle('app-relaunch', () => {
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('open-external', async (_, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    throw new Error('Only HTTP(S) URLs can be opened externally');
  }

  await shell.openExternal(url);
});
