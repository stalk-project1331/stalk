const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // fullscreen
  toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),
  exitFullscreen: () => ipcRenderer.send('window-exit-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('window-is-fullscreen'),
  onFullscreenChange: (callback) => {
    const handler = (_, value) => callback(value);
    ipcRenderer.on('window-fullscreen-changed', handler);
    return () => ipcRenderer.removeListener('window-fullscreen-changed', handler);
  },

  // sources
  addSources: () => ipcRenderer.invoke('add-sources'),
  getSources: () => ipcRenderer.invoke('get-sources'),
  removeSource: (id) => ipcRenderer.invoke('remove-source', id),

  // NightSearch API
  nightSearchStatus: (apiKey) =>
    ipcRenderer.invoke('nightsearch:status', apiKey),

  nightSearchSearch: (payload) =>
    ipcRenderer.invoke('nightsearch:search', payload)
});

// notifications relay
ipcRenderer.on('notification', (_, message) => {
  window.dispatchEvent(
    new CustomEvent('notification', { detail: message })
  );
});