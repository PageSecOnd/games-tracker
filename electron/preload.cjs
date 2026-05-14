const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopApi', {
  getStore: () => ipcRenderer.invoke('store:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  syncLibrary: () => ipcRenderer.invoke('library:sync'),
  syncAchievements: (appId) => ipcRenderer.invoke('achievement:sync', appId),
  saveMeta: (game) => ipcRenderer.invoke('meta:save', game),
  openUrl: (url) => ipcRenderer.invoke('open:url', url)
})
