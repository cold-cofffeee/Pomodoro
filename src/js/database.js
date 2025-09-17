// Local Database Manager for Pomodoro App
class LocalDatabase {
    constructor() {
        this.dbPath = 'pomodoro-settings.json';
        this.defaultSettings = {
            theme: null, // null means use system default
            lastThemeState: null,
            soundboard: {
                masterVolume: 1.0,
                isMuted: false,
                activeSounds: [],
                customSounds: [],
                presets: {}
            },
            timer: {
                focusTime: 25,
                shortBreak: 5,
                longBreak: 15,
                autoStart: false,
                notifications: true
            },
            youtube: {
                savedTracks: []
            },
            general: {
                autoLaunch: false,
                minimizeToTray: true,
                closeToTray: true
            },
            lastSaved: null
        };
        this.isElectron = typeof window !== 'undefined' && window.electronAPI;
    }

    async loadSettings() {
        try {
            let data;
            
            if (this.isElectron) {
                // Use Electron's file system
                data = await window.electronAPI.readFile(this.dbPath);
            } else {
                // Use localStorage as fallback
                const stored = localStorage.getItem('pomodoro-db');
                data = stored ? JSON.parse(stored) : null;
            }

            if (data) {
                // Merge with defaults to ensure all properties exist
                const settings = this.mergeWithDefaults(data);
                console.log('Settings loaded from local database');
                return settings;
            } else {
                console.log('No existing settings found, using defaults');
                return { ...this.defaultSettings };
            }
        } catch (error) {
            console.error('Error loading settings from database:', error);
            return { ...this.defaultSettings };
        }
    }

    async saveSettings(settings) {
        try {
            const dataToSave = {
                ...settings,
                lastSaved: new Date().toISOString()
            };

            if (this.isElectron) {
                // Use Electron's file system
                await window.electronAPI.writeFile(this.dbPath, JSON.stringify(dataToSave, null, 2));
            } else {
                // Use localStorage as fallback
                localStorage.setItem('pomodoro-db', JSON.stringify(dataToSave));
            }

            console.log('Settings saved to local database');
            return true;
        } catch (error) {
            console.error('Error saving settings to database:', error);
            return false;
        }
    }

    async updateSetting(key, value) {
        try {
            const settings = await this.loadSettings();
            this.setNestedProperty(settings, key, value);
            await this.saveSettings(settings);
            return true;
        } catch (error) {
            console.error('Error updating setting:', error);
            return false;
        }
    }

    async getSetting(key, defaultValue = null) {
        try {
            const settings = await this.loadSettings();
            return this.getNestedProperty(settings, key, defaultValue);
        } catch (error) {
            console.error('Error getting setting:', error);
            return defaultValue;
        }
    }

    // Helper method to set nested properties using dot notation
    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    // Helper method to get nested properties using dot notation
    getNestedProperty(obj, path, defaultValue = null) {
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }
        
        return current;
    }

    // Merge loaded data with defaults to ensure all properties exist
    mergeWithDefaults(loadedData) {
        const merged = { ...this.defaultSettings };
        
        // Deep merge function
        const deepMerge = (target, source) => {
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key] || typeof target[key] !== 'object') {
                        target[key] = {};
                    }
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        };

        deepMerge(merged, loadedData);
        return merged;
    }

    async resetToDefaults() {
        try {
            await this.saveSettings({ ...this.defaultSettings });
            console.log('Settings reset to defaults');
            return true;
        } catch (error) {
            console.error('Error resetting settings:', error);
            return false;
        }
    }

    async exportSettings() {
        try {
            const settings = await this.loadSettings();
            const exportData = {
                ...settings,
                exportedAt: new Date().toISOString(),
                version: '1.0'
            };
            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('Error exporting settings:', error);
            return null;
        }
    }

    async importSettings(jsonData) {
        try {
            const importedData = JSON.parse(jsonData);
            
            // Validate imported data
            if (!importedData || typeof importedData !== 'object') {
                throw new Error('Invalid settings data');
            }

            // Remove export metadata
            delete importedData.exportedAt;
            delete importedData.version;

            const mergedSettings = this.mergeWithDefaults(importedData);
            await this.saveSettings(mergedSettings);
            
            console.log('Settings imported successfully');
            return true;
        } catch (error) {
            console.error('Error importing settings:', error);
            return false;
        }
    }
}

// Create global database instance
window.pomodoroDb = new LocalDatabase();