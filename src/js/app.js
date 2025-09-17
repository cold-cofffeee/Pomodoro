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
            // Load theme from local database
            const savedTheme = await window.pomodoroDb.getSetting('theme');
            const lastThemeState = await window.pomodoroDb.getSetting('lastThemeState');
            
            // Determine theme: saved preference > last state > system default
            if (savedTheme === 'dark') {
                this.isDarkMode = true;
            } else if (savedTheme === 'light') {
                this.isDarkMode = false;
            } else if (lastThemeState !== null) {
                this.isDarkMode = lastThemeState;
            } else {
                // Default to system theme
                this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
            
            console.log(`Theme loaded: ${this.isDarkMode ? 'dark' : 'light'} (source: ${savedTheme || 'system'})`);
            this.applyTheme();
            
            // Set up protection against unwanted theme changes
            this.setupThemeProtection();
            
            // Save the loaded state
            await this.saveThemeState();
        } catch (error) {
            console.error('Error loading theme:', error);
            // Fallback to system theme
            this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.applyTheme();
        }
    }

    async saveThemeState() {
        try {
            await window.pomodoroDb.updateSetting('lastThemeState', this.isDarkMode);
        } catch (error) {
            console.error('Error saving theme state:', error);
        }
    }

    setupThemeProtection() {
        // Store the current theme state to detect unwanted changes
        this.currentThemeState = this.isDarkMode;
        
        // ULTRA AGGRESSIVE protection - check every 200ms
        this.themeProtectionInterval = setInterval(async () => {
            const currentDOMTheme = document.documentElement.classList.contains('dark');
            
            // If DOM theme doesn't match our app state, force restore it immediately
            if (currentDOMTheme !== this.isDarkMode) {
                console.log('CRITICAL: External theme interference detected - FORCING RESTORATION');
                this.forceApplyTheme();
                
                // Also save the correct state to database to prevent persistence of wrong theme
                await this.saveThemeState();
            }
        }, 200); // Check every 200ms for maximum protection
        
        // IMMEDIATE protection via MutationObserver
        const observer = new MutationObserver(async (mutations) => {
            mutations.forEach(async (mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const currentDOMTheme = document.documentElement.classList.contains('dark');
                    
                    // If DOM theme doesn't match our app state, immediately restore it
                    if (currentDOMTheme !== this.isDarkMode) {
                        console.log('INSTANT theme fix - interference blocked immediately');
                        this.forceApplyTheme();
                        await this.saveThemeState();
                    }
                }
            });
        });
        
        // Observe changes to document element class with maximum sensitivity
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
            childList: false,
            subtree: false
        });

        // Additional protection: monitor for iframe insertions that might cause issues
        const bodyObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IFRAME') {
                            console.log('IFRAME detected, scheduling theme protection...');
                            // Schedule multiple theme checks after iframe load
                            setTimeout(() => this.forceApplyTheme(), 100);
                            setTimeout(() => this.forceApplyTheme(), 300);
                            setTimeout(() => this.forceApplyTheme(), 600);
                            setTimeout(() => this.forceApplyTheme(), 1000);
                        }
                    });
                }
            });
        });
        
        bodyObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    forceApplyTheme() {
        // NUCLEAR OPTION: Completely reset and reapply theme
        console.log(`FORCING theme application: ${this.isDarkMode ? 'DARK' : 'LIGHT'} mode`);
        
        // Step 1: Clear ALL classes
        document.documentElement.className = '';
        
        // Step 2: Force reflow
        document.documentElement.offsetHeight;
        
        // Step 3: Apply correct theme
        if (this.isDarkMode) {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.setAttribute('data-theme', 'light');
        }
        
        // Step 4: Force another reflow
        document.documentElement.offsetHeight;
        
        // Step 5: Double-check and re-apply if needed (after microtask)
        Promise.resolve().then(() => {
            const currentDOMTheme = document.documentElement.classList.contains('dark');
            if (currentDOMTheme !== this.isDarkMode) {
                console.log('EMERGENCY: Theme still incorrect after force apply, trying again...');
                document.documentElement.className = '';
                if (this.isDarkMode) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                    document.documentElement.classList.add('light');
                    document.documentElement.setAttribute('data-theme', 'light');
                }
            }
        });
        
        // Step 6: Final check after 50ms
        setTimeout(() => {
            const currentDOMTheme = document.documentElement.classList.contains('dark');
            if (currentDOMTheme !== this.isDarkMode) {
                console.error('CRITICAL: Theme protection failed - manual intervention required');
                // One last attempt
                document.documentElement.className = this.isDarkMode ? 'dark' : 'light';
            }
        }, 50);
    }

    // Cleanup method to remove intervals when app closes
    cleanup() {
        if (this.themeProtectionInterval) {
            clearInterval(this.themeProtectionInterval);
        }
    }

    applyTheme() {
        this.forceApplyTheme();
    }

    async toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.currentThemeState = this.isDarkMode; // Update tracked state
        this.applyTheme();
        
        console.log(`Manual theme change to: ${this.isDarkMode ? 'dark' : 'light'}`);
        
        try {
            // Save theme preference to database
            await window.pomodoroDb.updateSetting('theme', this.isDarkMode ? 'dark' : 'light');
            await this.saveThemeState();
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