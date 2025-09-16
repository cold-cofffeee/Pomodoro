// Main Application Controller
class FocusSoundboardApp {
    constructor() {
        this.timer = null;
        this.soundboard = null;
        this.settings = null;
        this.ui = null;
        
        this.isElectron = typeof window.electronAPI !== 'undefined';
        this.isDarkMode = false;
        
        this.init();
    }

    async init() {
        console.log('Initializing Focus Soundboard App...');
        
        // Load saved theme
        await this.loadTheme();
        
        // Initialize UI controller
        this.ui = new UIController();
        
        // Initialize settings
        this.settings = new SettingsManager();
        await this.settings.init();
        
        // Initialize timer
        this.timer = new PomodoroTimer();
        await this.timer.init();
        
        // Initialize soundboard
        this.soundboard = new Soundboard();
        await this.soundboard.init();
        
        // Initialize YouTube Music integration
        this.youtubeMusic = new YouTubeMusic();
        await this.youtubeMusic.init();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up Electron-specific features
        if (this.isElectron) {
            this.setupElectronFeatures();
        }
        
        console.log('App initialized successfully!');
    }

    async loadTheme() {
        try {
            if (this.isElectron) {
                const savedTheme = await window.electronAPI.store.get('theme');
                // Default to system theme if no saved preference
                this.isDarkMode = savedTheme === 'dark' || (savedTheme === 'light' ? false : window.matchMedia('(prefers-color-scheme: dark)').matches);
            } else {
                const savedTheme = localStorage.getItem('theme');
                // Default to system theme if no saved preference
                this.isDarkMode = savedTheme === 'dark' || (savedTheme === 'light' ? false : window.matchMedia('(prefers-color-scheme: dark)').matches);
            }
            
            this.applyTheme();
            
            // Set up protection against unwanted theme changes
            this.setupThemeProtection();
        } catch (error) {
            console.error('Error loading theme:', error);
            // Fallback to system theme
            this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.applyTheme();
        }
    }

    setupThemeProtection() {
        // Store the current theme state to detect unwanted changes
        this.currentThemeState = this.isDarkMode;
        
        // Aggressive protection - check every 500ms and force theme if needed
        setInterval(() => {
            const currentDOMTheme = document.documentElement.classList.contains('dark');
            
            // If DOM theme doesn't match our app state, force restore it
            if (currentDOMTheme !== this.isDarkMode) {
                console.log('FORCING theme restoration - external interference detected');
                this.forceApplyTheme();
            }
        }, 500);
        
        // Also listen for any class changes and immediately fix them
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const currentDOMTheme = document.documentElement.classList.contains('dark');
                    
                    // If DOM theme doesn't match our app state, immediately restore it
                    if (currentDOMTheme !== this.isDarkMode) {
                        console.log('IMMEDIATE theme fix - interference blocked');
                        this.forceApplyTheme();
                    }
                }
            });
        });
        
        // Observe changes to document element class
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    forceApplyTheme() {
        // Aggressively apply theme
        document.documentElement.className = ''; // Clear all classes first
        
        if (this.isDarkMode) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
        }
        
        // Force it again after a tiny delay to ensure it sticks
        setTimeout(() => {
            if (this.isDarkMode) {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
            } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
            }
        }, 10);
    }

    applyTheme() {
        this.forceApplyTheme();
    }

    async toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.currentThemeState = this.isDarkMode; // Update tracked state
        this.applyTheme();
        
        try {
            if (this.isElectron) {
                await window.electronAPI.store.set('theme', this.isDarkMode ? 'dark' : 'light');
            } else {
                localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
            }
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    }

    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.settings.show());
        }

        // Window controls (for non-macOS)
        if (process.platform !== 'darwin' && this.isElectron) {
            const titleBar = document.getElementById('title-bar');
            if (titleBar) {
                titleBar.classList.remove('hidden');
            }

            const minimizeBtn = document.getElementById('minimize-btn');
            const maximizeBtn = document.getElementById('maximize-btn');
            const closeBtn = document.getElementById('close-btn');

            if (minimizeBtn) {
                minimizeBtn.addEventListener('click', () => {
                    if (this.isElectron) window.electronAPI.minimizeWindow();
                });
            }

            if (maximizeBtn) {
                maximizeBtn.addEventListener('click', () => {
                    if (this.isElectron) window.electronAPI.maximizeWindow();
                });
            }

            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    if (this.isElectron) window.electronAPI.closeWindow();
                });
            }
        }

        // Prevent default drag and drop on window
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'd':
                        e.preventDefault();
                        this.toggleTheme();
                        break;
                    case ',':
                        e.preventDefault();
                        this.settings.show();
                        break;
                }
            }
            
            // Global shortcuts with Shift
            if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                switch (e.key) {
                    case 'F':
                        e.preventDefault();
                        this.timer.startFocus();
                        break;
                    case 'B':
                        e.preventDefault();
                        this.timer.startBreak();
                        break;
                    case 'S':
                        e.preventDefault();
                        this.timer.stop();
                        break;
                    case 'M':
                        e.preventDefault();
                        this.soundboard.muteAll();
                        break;
                }
            }
        });
    }

    setupElectronFeatures() {
        // Listen for menu and tray actions
        if (window.electronAPI && window.electronAPI.onMenuAction) {
            window.electronAPI.onMenuAction((event, action) => {
                this.handleElectronAction(action);
            });
        }
    }

    handleElectronAction(action) {
        switch (action) {
            case 'menu-import-sounds':
            case 'tray-import-sounds':
                this.soundboard.importSounds();
                break;
            case 'menu-open-settings':
                this.settings.show();
                break;
            case 'menu-start-focus':
            case 'tray-start-focus':
            case 'shortcut-start-focus':
                this.timer.startFocus();
                break;
            case 'menu-start-break':
            case 'tray-start-break':
            case 'shortcut-start-break':
                this.timer.startBreak();
                break;
            case 'menu-stop-timer':
            case 'tray-stop-timer':
            case 'shortcut-stop-timer':
                this.timer.stop();
                break;
            case 'menu-mute-all':
            case 'tray-mute-all':
            case 'shortcut-mute-all':
                this.soundboard.muteAll();
                break;
            case 'menu-toggle-theme':
                this.toggleTheme();
                break;
            case 'menu-show-about':
                this.ui.showAbout();
                break;
        }
    }

    // Utility methods
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    showNotification(title, body, type = 'info') {
        // Use Electron notification if available
        if (this.isElectron && window.electronAPI.showNotification) {
            window.electronAPI.showNotification(title, body);
        }
        
        // Also show in-app toast
        this.ui.showToast(title, body, type);
    }

    async saveData(key, data) {
        try {
            if (this.isElectron) {
                await window.electronAPI.store.set(key, data);
            } else {
                localStorage.setItem(key, JSON.stringify(data));
            }
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    async loadData(key, defaultValue = null) {
        try {
            if (this.isElectron) {
                const data = await window.electronAPI.store.get(key);
                return data !== undefined ? data : defaultValue;
            } else {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : defaultValue;
            }
        } catch (error) {
            console.error('Error loading data:', error);
            return defaultValue;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.focusApp = new FocusSoundboardApp();
});

// Handle app errors
window.addEventListener('error', (error) => {
    console.error('Application error:', error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});