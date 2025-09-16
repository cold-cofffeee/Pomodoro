const { app, BrowserWindow, Menu, Tray, ipcMain, globalShortcut, Notification, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize electron-store for persistent data
const store = new Store();

class FocusSoundboardApp {
  constructor() {
    this.mainWindow = null;
    this.tray = null;
    this.isQuitting = false;
    this.isDev = process.argv.includes('--dev');
    
    this.init();
  }

  init() {
    app.whenReady().then(() => {
      this.createWindow();
      this.createTray();
      this.setupGlobalShortcuts();
      // this.setupMenu(); // Menu disabled per user request
      this.setupIPC();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    app.on('before-quit', () => {
      this.isQuitting = true;
    });
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'hiddenInset',
      frame: process.platform === 'darwin' ? false : true,
      icon: path.join(__dirname, 'src/assets/icons/icon.png'),
      show: false,
      autoHideMenuBar: true
    });

    this.mainWindow.loadFile('src/index.html');

    if (this.isDev) {
      this.mainWindow.webContents.openDevTools();
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting && process.platform === 'darwin') {
        event.preventDefault();
        this.mainWindow.hide();
      }
    });

    this.mainWindow.on('minimize', (event) => {
      if (process.platform === 'win32') {
        event.preventDefault();
        this.mainWindow.hide();
      }
    });
  }

  createTray() {
    try {
      const trayIconPath = path.join(__dirname, 'src/assets/icons/tray-icon.png');
      
      // Check if the icon file exists before creating tray
      const fs = require('fs');
      if (!fs.existsSync(trayIconPath)) {
        console.warn('Tray icon not found, skipping tray creation');
        return;
      }
      
      this.tray = new Tray(trayIconPath);

      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show App',
          click: () => {
            this.mainWindow.show();
          }
        },
        {
          label: 'Start Focus Session',
          click: () => {
            this.mainWindow.webContents.send('tray-start-focus');
          }
        },
        {
          label: 'Start Break',
          click: () => {
            this.mainWindow.webContents.send('tray-start-break');
          }
        },
        {
          label: 'Stop Timer',
          click: () => {
            this.mainWindow.webContents.send('tray-stop-timer');
          }
        },
        { type: 'separator' },
        {
          label: 'Mute All Sounds',
          click: () => {
            this.mainWindow.webContents.send('tray-mute-all');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => {
          this.isQuitting = true;
          app.quit();
        }
      }
    ]);

    this.tray.setToolTip('Focus Soundboard');
    this.tray.setContextMenu(contextMenu);

    this.tray.on('click', () => {
      this.mainWindow.isVisible() ? this.mainWindow.hide() : this.mainWindow.show();
    });
    
    } catch (error) {
      console.warn('Failed to create system tray:', error.message);
    }
  }

  setupGlobalShortcuts() {
    // Register global shortcuts
    globalShortcut.register('CommandOrControl+Shift+F', () => {
      this.mainWindow.webContents.send('shortcut-start-focus');
    });

    globalShortcut.register('CommandOrControl+Shift+B', () => {
      this.mainWindow.webContents.send('shortcut-start-break');
    });

    globalShortcut.register('CommandOrControl+Shift+S', () => {
      this.mainWindow.webContents.send('shortcut-stop-timer');
    });

    globalShortcut.register('CommandOrControl+Shift+M', () => {
      this.mainWindow.webContents.send('shortcut-mute-all');
    });

    globalShortcut.register('CommandOrControl+Shift+T', () => {
      this.mainWindow.isVisible() ? this.mainWindow.hide() : this.mainWindow.show();
    });
  }

  setupMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Import Sounds',
            accelerator: 'CmdOrCtrl+I',
            click: () => {
              this.mainWindow.webContents.send('menu-import-sounds');
            }
          },
          { type: 'separator' },
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              this.mainWindow.webContents.send('menu-open-settings');
            }
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              this.isQuitting = true;
              app.quit();
            }
          }
        ]
      },
      {
        label: 'Timer',
        submenu: [
          {
            label: 'Start Focus Session',
            accelerator: 'CmdOrCtrl+Shift+F',
            click: () => {
              this.mainWindow.webContents.send('menu-start-focus');
            }
          },
          {
            label: 'Start Break',
            accelerator: 'CmdOrCtrl+Shift+B',
            click: () => {
              this.mainWindow.webContents.send('menu-start-break');
            }
          },
          {
            label: 'Stop Timer',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => {
              this.mainWindow.webContents.send('menu-stop-timer');
            }
          }
        ]
      },
      {
        label: 'Audio',
        submenu: [
          {
            label: 'Mute All',
            accelerator: 'CmdOrCtrl+Shift+M',
            click: () => {
              this.mainWindow.webContents.send('menu-mute-all');
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Toggle Dark Mode',
            accelerator: 'CmdOrCtrl+D',
            click: () => {
              this.mainWindow.webContents.send('menu-toggle-theme');
            }
          },
          { type: 'separator' },
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About',
            click: () => {
              this.mainWindow.webContents.send('menu-show-about');
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIPC() {
    console.log('Setting up IPC handlers...');
    
    try {
      // Store operations
      console.log('Registering store handlers...');
      ipcMain.handle('store-get', (event, key) => {
        return store.get(key);
      });

      ipcMain.handle('store-set', (event, key, value) => {
        store.set(key, value);
      });

      ipcMain.handle('store-delete', (event, key) => {
        store.delete(key);
      });

      // Notification
      console.log('Registering notification handlers...');
      ipcMain.handle('show-notification', (event, title, body, icon) => {
        if (Notification.isSupported()) {
          const notification = new Notification({
            title,
            body,
            icon: icon || path.join(__dirname, 'src/assets/icons/icon.png'),
            silent: false
          });
          notification.show();
        }
      });

    // File dialog for importing sounds
    ipcMain.handle('show-open-dialog', async () => {
      const { dialog } = require('electron');
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'aac', 'm4a'] }
        ]
      });
      return result;
    });

    // Update tray tooltip with timer status
    ipcMain.on('update-tray-tooltip', (event, text) => {
      if (this.tray) {
        this.tray.setToolTip(text);
      }
    });

    // Window controls
    ipcMain.on('minimize-window', () => {
      this.mainWindow.minimize();
    });

    ipcMain.on('maximize-window', () => {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    });

    ipcMain.on('close-window', () => {
      this.mainWindow.close();
    });

    // YouTube Music API handlers
    ipcMain.handle('youtube-music-init', async () => {
      try {
        console.log('Attempting to initialize YouTube Music API...');
        
        // Import ytmusic-api (it exports the class directly)
        const YTMusic = require('ytmusic-api');
        
        if (!YTMusic) {
          throw new Error('YTMusic class not available');
        }
        
        this.ytMusic = new YTMusic();
        
        // Set a timeout for initialization
        const initPromise = this.ytMusic.initialize();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('YouTube Music API initialization timeout')), 10000);
        });
        
        await Promise.race([initPromise, timeoutPromise]);
        
        console.log('YouTube Music API initialized successfully');
        return true;
      } catch (error) {
        console.error('Failed to initialize YouTube Music API:', error.message);
        this.ytMusic = null;
        return false;
      }
    });

    ipcMain.handle('youtube-music-search', async (event, options) => {
      if (!this.ytMusic) {
        throw new Error('YouTube Music not initialized. Please try reconnecting.');
      }
      
      try {
        console.log(`Searching YouTube Music: ${options.query}`);
        
        // Set a timeout for search
        const searchPromise = this.ytMusic.searchSongs(options.query, {
          limit: options.limit || 20
        });
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('YouTube Music search timeout')), 15000);
        });
        
        const results = await Promise.race([searchPromise, timeoutPromise]);
        
        if (!results || !Array.isArray(results)) {
          throw new Error('Invalid search results from YouTube Music');
        }
        
        // Transform results to our format
        const transformedResults = results.map(song => ({
          videoId: song.videoId || song.id,
          title: song.name || song.title || 'Unknown Title',
          author: song.artist?.name || song.author || 'Unknown Artist',
          duration: song.duration?.totalSeconds || song.duration || 0,
          thumbnails: song.thumbnails || [],
          album: song.album?.name || '',
          year: song.year || null
        })).filter(song => song.videoId); // Filter out songs without videoId
        
        console.log(`Found ${transformedResults.length} songs for "${options.query}"`);
        return transformedResults;
      } catch (error) {
        console.error('YouTube Music search error:', error.message);
        throw new Error(`Search failed: ${error.message}`);
      }
    });

    ipcMain.handle('youtube-music-get-stream', async (event, videoId) => {
      if (!this.ytMusic) {
        throw new Error('YouTube Music not initialized');
      }
      
      try {
        console.log(`Getting stream URL for: ${videoId}`);
        const song = await this.ytMusic.getSong(videoId);
        
        console.log('Song data structure:', JSON.stringify(song, null, 2).substring(0, 1000) + '...');
        
        if (song && song.streamingData && song.streamingData.adaptiveFormats) {
          // Find the best audio format
          const audioFormats = song.streamingData.adaptiveFormats.filter(
            format => format.mimeType && format.mimeType.includes('audio')
          );
          
          console.log(`Found ${audioFormats.length} audio formats`);
          
          if (audioFormats.length > 0) {
            // Sort by quality and choose the best one
            audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
            const bestFormat = audioFormats[0];
            
            console.log(`Using format: ${bestFormat.mimeType}, bitrate: ${bestFormat.bitrate}`);
            console.log(`Stream URL obtained for: ${videoId}`);
            return {
              url: bestFormat.url,
              mimeType: bestFormat.mimeType,
              bitrate: bestFormat.bitrate,
              contentLength: bestFormat.contentLength
            };
          } else {
            console.log('No audio formats found in adaptiveFormats');
          }
        } else {
          console.log('Song data missing or invalid structure');
          console.log('Song keys:', song ? Object.keys(song) : 'song is null/undefined');
        }
        
        // Fallback: try to find any playable URL in the song data
        if (song && song.videoDetails && song.videoDetails.videoId) {
          console.log('Trying fallback approach...');
          // Sometimes the URL might be in a different location
          if (song.formats && song.formats.length > 0) {
            const audioFormat = song.formats.find(f => f.mimeType && f.mimeType.includes('audio'));
            if (audioFormat) {
              console.log('Found audio format in formats array');
              return {
                url: audioFormat.url,
                mimeType: audioFormat.mimeType,
                bitrate: audioFormat.bitrate || 128,
                contentLength: audioFormat.contentLength
              };
            }
          }
        }
        
        throw new Error('No suitable audio format found in song data');
      } catch (error) {
        console.error('Failed to get stream URL:', error);
        console.error('Error details:', error.message);
        throw error;
      }
    });
    
    // Open URL handler (for YouTube playback)
    ipcMain.handle('open-url', async (event, url) => {
      try {
        console.log(`Opening URL: ${url}`);
        shell.openExternal(url);
        return true;
      } catch (error) {
        console.error('Failed to open URL:', error);
        throw error;
      }
    });
    
    console.log('All IPC handlers registered successfully');
    
    } catch (error) {
      console.error('Error setting up IPC handlers:', error);
      throw error;
    }
  }
}

// Create app instance
new FocusSoundboardApp();