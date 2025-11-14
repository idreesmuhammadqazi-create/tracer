const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Menu actions
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new-file', callback);
    ipcRenderer.on('menu-open-file', callback);
    ipcRenderer.on('menu-save-file', callback);
    ipcRenderer.on('menu-save-as', callback);
    ipcRenderer.on('menu-export-cpp', callback);
    ipcRenderer.on('menu-run', callback);
    ipcRenderer.on('menu-step', callback);
    ipcRenderer.on('menu-continue', callback);
    ipcRenderer.on('menu-stop', callback);
    ipcRenderer.on('menu-reset', callback);
  },

  // File operations
  saveFile: (content, filePath) => ipcRenderer.invoke('save-file', { content, filePath }),
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  showExportDialog: () => ipcRenderer.invoke('show-export-dialog'),

  // Platform info
  platform: process.platform,

  // Remove listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('menu-new-file');
    ipcRenderer.removeAllListeners('menu-open-file');
    ipcRenderer.removeAllListeners('menu-save-file');
    ipcRenderer.removeAllListeners('menu-save-as');
    ipcRenderer.removeAllListeners('menu-export-cpp');
    ipcRenderer.removeAllListeners('menu-run');
    ipcRenderer.removeAllListeners('menu-step');
    ipcRenderer.removeAllListeners('menu-continue');
    ipcRenderer.removeAllListeners('menu-stop');
    ipcRenderer.removeAllListeners('menu-reset');
  }
});