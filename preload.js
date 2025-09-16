const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Store operations
  store: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key)
  },

  // Notifications
  showNotification: (title, body, icon) => 
    ipcRenderer.invoke('show-notification', title, body, icon),

  // File operations
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),

  // Tray updates
  updateTrayTooltip: (text) => ipcRenderer.send('update-tray-tooltip', text),

  // YouTube Music API
  youtubeMusic: {
    init: () => ipcRenderer.invoke('youtube-music-init'),
    search: (options) => ipcRenderer.invoke('youtube-music-search', options),
    getStreamUrl: (videoId) => ipcRenderer.invoke('youtube-music-get-stream', videoId)
  },

  // Open URL in external browser or hidden window
  openUrl: (url) => ipcRenderer.invoke('open-url', url),

  // Event listeners for menu and tray actions
  onMenuAction: (callback) => {
    const eventHandlers = [
      'menu-import-sounds',
      'menu-open-settings',
      'menu-start-focus',
      'menu-start-break',
      'menu-stop-timer',
      'menu-mute-all',
      'menu-toggle-theme',
      'menu-show-about',
      'tray-start-focus',
      'tray-start-break',
      'tray-stop-timer',
      'tray-mute-all',
      'shortcut-start-focus',
      'shortcut-start-break',
      'shortcut-stop-timer',
      'shortcut-mute-all'
    ];

    eventHandlers.forEach(event => {
      ipcRenderer.on(event, callback);
    });

    // Return cleanup function
    return () => {
      eventHandlers.forEach(event => {
        ipcRenderer.removeAllListeners(event);
      });
    };
  }
});