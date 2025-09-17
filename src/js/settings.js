// Settings Manager for application configuration
class SettingsManager {
    constructor() {
        this.db = null;
        this.settings = {
            timer: {
                adhdMode: false,
                autoStart: true,
                customDurations: {
                    focus: 25,
                    'short-break': 5,
                    'long-break': 15
                },
                soundEnabled: true,
                showNotifications: true
            },
            audio: {
                masterVolume: 1.0,
                notificationVolume: 0.7,
                muteOnBreaks: false,
                fadeDurationMs: 800,
                customNotificationSounds: { complete: null, break: null, focus: null }
            },
            appearance: {
                theme: 'auto', // 'light', 'dark', 'auto'
                animations: true,
                showProgressInTray: true
            },
            general: {
                startMinimized: false,
                closeToTray: true,
                launchOnStartup: false
            }
        };
    }

    async init() {
        console.log('Initializing Settings Manager...');
        
        // Initialize local database
        if (window.LocalDatabase) {
            this.db = new window.LocalDatabase();
            await this.db.init();
        }
        
        await this.loadSettings();
    }

    async loadSettings() {
        try {
            let savedSettings = {};
            
            if (this.db) {
                // Use local database
                savedSettings = await this.db.get('settings') || {};
            } else {
                // Fallback to old Electron store method
                savedSettings = await window.focusApp.loadData('app-settings', {});
            }
            
            this.settings = this.mergeSettings(this.settings, savedSettings);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        try {
            if (this.db) {
                // Use local database
                await this.db.set('settings', this.settings);
            } else {
                // Fallback to old Electron store method
                await window.focusApp.saveData('app-settings', this.settings);
            }
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    mergeSettings(defaults, saved) {
        const merged = { ...defaults };
        
        Object.keys(saved).forEach(category => {
            if (merged[category]) {
                merged[category] = { ...merged[category], ...saved[category] };
            }
        });
        
        return merged;
    }

    show() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            this.renderSettingsModal();
            window.focusApp.ui.showModal('settings-modal');
        }
    }

    hide() {
        window.focusApp.ui.hideModal('settings-modal');
    }

    renderSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] flex overflow-hidden">
                <!-- Settings Sidebar -->
                <div class="w-1/3 bg-gray-50 dark:bg-gray-900 p-6 border-r border-gray-200 dark:border-gray-700">
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-6">Settings</h2>
                    
                    <nav class="space-y-2">
                        <button class="settings-tab w-full text-left px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors active" data-tab="timer">
                            <i class="fas fa-clock mr-3"></i>Timer
                        </button>
                        <button class="settings-tab w-full text-left px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" data-tab="audio">
                            <i class="fas fa-volume-up mr-3"></i>Audio
                        </button>
                        <button class="settings-tab w-full text-left px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" data-tab="youtube">
                            <i class="fab fa-youtube mr-3 text-red-500"></i>YouTube Music
                        </button>
                        <button class="settings-tab w-full text-left px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" data-tab="appearance">
                            <i class="fas fa-palette mr-3"></i>Appearance
                        </button>
                        <button class="settings-tab w-full text-left px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" data-tab="general">
                            <i class="fas fa-cog mr-3"></i>General
                        </button>
                        <button class="settings-tab w-full text-left px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" data-tab="stats">
                            <i class="fas fa-chart-bar mr-3"></i>Statistics
                        </button>
                    </nav>
                </div>
                
                <!-- Settings Content -->
                <div class="flex-1 p-6 flex flex-col">
                    <div id="settings-content" class="flex-1 overflow-hidden">
                        <div class="h-full max-h-[60vh] overflow-y-auto settings-scroll">
                            ${this.renderTimerSettings()}
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="flex justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <button id="reset-settings" class="btn-ghost text-red-600 dark:text-red-400">
                            <i class="fas fa-undo mr-2"></i>Reset to Defaults
                        </button>
                        <div class="space-x-3">
                            <button id="cancel-settings" class="btn-ghost">Cancel</button>
                            <button id="save-settings" class="btn-primary">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachSettingsListeners();
    }

    attachSettingsListeners() {
        // Tab navigation
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.showSettingsTab(tabName);
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });

        // Action buttons
        const saveBtn = document.getElementById('save-settings');
        const cancelBtn = document.getElementById('cancel-settings');
        const resetBtn = document.getElementById('reset-settings');

        saveBtn?.addEventListener('click', () => this.saveCurrentSettings());
        cancelBtn?.addEventListener('click', () => this.hide());
        resetBtn?.addEventListener('click', () => this.resetToDefaults());
    }

    showSettingsTab(tabName) {
        const content = document.getElementById('settings-content');
        if (!content) return;

        let tabContent = '';
        switch (tabName) {
            case 'timer':
                tabContent = this.renderTimerSettings();
                break;
            case 'audio':
                tabContent = this.renderAudioSettings();
                break;
            case 'youtube':
                tabContent = this.renderYouTubeSettings();
                break;
            case 'appearance':
                tabContent = this.renderAppearanceSettings();
                break;
            case 'general':
                tabContent = this.renderGeneralSettings();
                break;
            case 'stats':
                tabContent = this.renderStatsSettings();
                break;
        }

        content.innerHTML = `
            <div class="h-full max-h-[60vh] overflow-y-auto settings-scroll">
                ${tabContent}
            </div>
        `;

        this.attachTabSpecificListeners(tabName);
    }

    renderTimerSettings() {
        return `
            <div class="space-y-6">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Timer Settings</h3>
                </div>
                
                <!-- ADHD Mode -->
                <div class="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div class="flex items-center space-x-3">
                        <i class="fas fa-bolt text-amber-500"></i>
                        <div>
                            <h4 class="font-medium text-gray-900 dark:text-white">ADHD Mode</h4>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Shorter focus sessions for better concentration</p>
                        </div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="adhd-mode-setting" class="sr-only peer" ${this.settings.timer.adhdMode ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
                    </label>
                </div>
                
                <!-- Auto Start -->
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-white">Auto Start Next Session</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Automatically start breaks and focus sessions</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="auto-start-setting" class="sr-only peer" ${this.settings.timer.autoStart ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500"></div>
                    </label>
                </div>
                
                <!-- Custom Durations -->
                <div>
                    <h4 class="font-medium text-gray-900 dark:text-white mb-4">Custom Durations (minutes)</h4>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Focus Session</label>
                            <input type="number" id="focus-duration" min="1" max="120" value="${this.settings.timer.customDurations.focus}" 
                                   class="input-field text-center">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Short Break</label>
                            <input type="number" id="short-break-duration" min="1" max="30" value="${this.settings.timer.customDurations['short-break']}" 
                                   class="input-field text-center">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Long Break</label>
                            <input type="number" id="long-break-duration" min="1" max="60" value="${this.settings.timer.customDurations['long-break']}" 
                                   class="input-field text-center">
                        </div>
                    </div>
                </div>
                
                <!-- Notifications -->
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-white">Desktop Notifications</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Show notifications when sessions complete</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="notifications-setting" class="sr-only peer" ${this.settings.timer.showNotifications ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500"></div>
                    </label>
                </div>
                
                <!-- Sound Alerts -->
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-white">Sound Alerts</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Play sound when timer completes</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="sound-alerts-setting" class="sr-only peer" ${this.settings.timer.soundEnabled ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500"></div>
                    </label>
                </div>
            </div>
        `;
    }

    renderAudioSettings() {
        return `
            <div class="space-y-6">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Audio Settings</h3>
                </div>
                
                <!-- Master Volume -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-medium text-gray-900 dark:text-white">Master Volume</h4>
                        <span id="master-volume-display" class="text-sm font-mono text-gray-500">${Math.round(this.settings.audio.masterVolume * 100)}%</span>
                    </div>
                    <input type="range" id="master-volume" min="0" max="1" step="0.01" value="${this.settings.audio.masterVolume}" 
                           class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer">
                </div>
                
                <!-- Notification Volume -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-medium text-gray-900 dark:text-white">Notification Volume</h4>
                        <span id="notification-volume-display" class="text-sm font-mono text-gray-500">${Math.round(this.settings.audio.notificationVolume * 100)}%</span>
                    </div>
                    <input type="range" id="notification-volume" min="0" max="1" step="0.01" value="${this.settings.audio.notificationVolume}" 
                           class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer">
                </div>
                
                <!-- Fade Duration -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-medium text-gray-900 dark:text-white">Fade Duration</h4>
                        <span class="text-sm font-mono text-gray-500"><span id="fade-duration-display">${this.settings.audio.fadeDurationMs}</span> ms</span>
                    </div>
                    <input type="range" id="fade-duration" min="0" max="3000" step="50" value="${this.settings.audio.fadeDurationMs}" 
                           class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer">
                </div>
                
                <!-- Mute on Breaks -->
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-white">Mute Sounds During Breaks</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Automatically mute ambient sounds during break sessions</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="mute-on-breaks" class="sr-only peer" ${this.settings.audio.muteOnBreaks ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500"></div>
                    </label>
                </div>
                
                <!-- Custom Notification Sounds -->
                <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <h4 class="font-medium text-gray-900 dark:text-white mb-3">Custom Notification Sounds</h4>
                    <div class="grid grid-cols-3 gap-3 text-xs">
                        ${['complete','break','focus'].map(key => `
                        <div class="space-y-2">
                            <label class="block text-gray-700 dark:text-gray-300 capitalize">${key} sound</label>
                            <div class="flex items-center space-x-2">
                                <input id="notif-${key}-path" type="text" class="input-field text-xs flex-1" placeholder="No file selected" value="${this.settings.audio.customNotificationSounds[key] || ''}" readonly>
                                <button data-key="${key}" class="btn-ghost text-xs pick-notif">Browse</button>
                                <button data-key="${key}" class="btn-ghost text-xs clear-notif">Clear</button>
                            </div>
                        </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Audio Test -->
                <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <h4 class="font-medium text-gray-900 dark:text-white mb-3">Test Audio</h4>
                    <div class="flex space-x-3">
                        <button id="test-notification" class="btn-ghost text-sm">
                            <i class="fas fa-bell mr-2"></i>Test Notification
                        </button>
                        <button id="test-complete" class="btn-ghost text-sm">
                            <i class="fas fa-check mr-2"></i>Test Complete Sound
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderYouTubeSettings() {
        return `
            <div class="space-y-6">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">YouTube Music Integration</h3>
                </div>
                
                <!-- YouTube Music Status -->
                <div class="p-4 ${window.focusApp.youtubeMusic?.isInitialized ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'} border rounded-xl">
                    <div class="flex items-start">
                        <i class="fas fa-${window.focusApp.youtubeMusic?.isInitialized ? 'check-circle text-green-500' : 'exclamation-triangle text-yellow-500'} mt-1 mr-3"></i>
                        <div>
                            <h5 class="font-medium ${window.focusApp.youtubeMusic?.isInitialized ? 'text-green-900 dark:text-green-200' : 'text-yellow-900 dark:text-yellow-200'}">
                                YouTube Music ${window.focusApp.youtubeMusic?.isInitialized ? 'Connected' : 'Not Available'}
                            </h5>
                            <p class="text-sm ${window.focusApp.youtubeMusic?.isInitialized ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'} mt-1">
                                ${window.focusApp.youtubeMusic?.isInitialized 
                                    ? 'Search and stream ambient music directly from YouTube Music to enhance your focus sessions.' 
                                    : 'YouTube Music integration requires an active internet connection and may not work in all regions.'}
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Quick Search Suggestions -->
                ${window.focusApp.youtubeMusic?.isInitialized ? `
                <div>
                    <h4 class="font-medium text-gray-900 dark:text-white mb-3">Quick Search</h4>
                    <div class="grid grid-cols-2 gap-2">
                        ${window.focusApp.youtubeMusic.getDefaultSearchQueries().slice(0, 8).map(query => `
                            <button onclick="document.getElementById('youtube-search').value = '${query}'; window.focusApp.settings.searchYouTubeMusic();" 
                                    class="btn-ghost text-xs text-left px-3 py-2">
                                <i class="fas fa-search mr-2"></i>${query}
                            </button>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <!-- Search YouTube Music -->
                ${window.focusApp.youtubeMusic?.isInitialized ? `
                <div>
                    <h4 class="font-medium text-gray-900 dark:text-white mb-3">Search YouTube Music</h4>
                    <div class="flex space-x-2">
                        <input type="text" id="youtube-search" placeholder="Search for ambient music, lo-fi, nature sounds..." 
                               class="input-field flex-1" onkeypress="if(event.key==='Enter') window.focusApp.settings.searchYouTubeMusic()">
                        <button onclick="window.focusApp.settings.searchYouTubeMusic()" class="btn-primary">
                            <i class="fas fa-search mr-2"></i>Search
                        </button>
                    </div>
                    
                    <div id="youtube-results" class="hidden mt-4">
                        <h5 class="font-medium text-gray-900 dark:text-white mb-3">Search Results</h5>
                        <div id="youtube-results-list" class="space-y-2 max-h-64 overflow-y-auto">
                            <!-- Results will be populated here -->
                        </div>
                    </div>
                </div>
                ` : `
                <div class="text-center py-8">
                    <i class="fab fa-youtube text-4xl text-gray-400 mb-4"></i>
                    <h4 class="font-medium text-gray-900 dark:text-white mb-2">YouTube Music Unavailable</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        YouTube Music integration is currently not available. Please check your internet connection and try restarting the app.
                    </p>
                    <button onclick="window.focusApp.youtubeMusic.init()" class="btn-primary">
                        <i class="fas fa-redo mr-2"></i>Retry Connection
                    </button>
                </div>
                `}

                <!-- Saved YouTube Tracks -->
                <div>
                    <h4 class="font-medium text-gray-900 dark:text-white mb-3">Saved YouTube Tracks</h4>
                    <div id="saved-youtube-tracks" class="space-y-2">
                        <p class="text-gray-600 dark:text-gray-400 text-sm">Loading saved tracks...</p>
                    </div>
                </div>
                
                <!-- Usage Tips -->
                <div class="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <h4 class="font-medium text-blue-900 dark:text-blue-200 mb-2">
                        <i class="fas fa-lightbulb mr-2"></i>Usage Tips
                    </h4>
                    <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Search for longer tracks (30+ minutes) for uninterrupted focus sessions</li>
                        <li>• Try keywords like "ambient", "lo-fi", "nature sounds", or "white noise"</li>
                        <li>• Added tracks will appear in your soundboard for easy access</li>
                        <li>• Streams may occasionally need refreshing due to YouTube's policies</li>
                    </ul>
                </div>
            </div>
        `;
    }

    renderAppearanceSettings() {
        return `
            <div class="space-y-6">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance Settings</h3>
                </div>
                
                <!-- Theme Selection -->
                <div>
                    <h4 class="font-medium text-gray-900 dark:text-white mb-3">Theme</h4>
                    <div class="grid grid-cols-3 gap-3">
                        <label class="theme-option cursor-pointer">
                            <input type="radio" name="theme" value="light" class="sr-only" ${this.settings.appearance.theme === 'light' ? 'checked' : ''}>
                            <div class="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 transition-colors theme-light">
                                <div class="w-full h-16 bg-white rounded-lg shadow-sm mb-2"></div>
                                <p class="text-sm font-medium text-center">Light</p>
                            </div>
                        </label>
                        <label class="theme-option cursor-pointer">
                            <input type="radio" name="theme" value="dark" class="sr-only" ${this.settings.appearance.theme === 'dark' ? 'checked' : ''}>
                            <div class="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 transition-colors theme-dark">
                                <div class="w-full h-16 bg-gray-800 rounded-lg shadow-sm mb-2"></div>
                                <p class="text-sm font-medium text-center">Dark</p>
                            </div>
                        </label>
                        <label class="theme-option cursor-pointer">
                            <input type="radio" name="theme" value="auto" class="sr-only" ${this.settings.appearance.theme === 'auto' ? 'checked' : ''}>
                            <div class="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 transition-colors theme-auto">
                                <div class="w-full h-16 bg-gradient-to-r from-white to-gray-800 rounded-lg shadow-sm mb-2"></div>
                                <p class="text-sm font-medium text-center">Auto</p>
                            </div>
                        </label>
                    </div>
                </div>
                
                <!-- Animations -->
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-white">Smooth Animations</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Enable UI animations and transitions</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="animations-setting" class="sr-only peer" ${this.settings.appearance.animations ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500"></div>
                    </label>
                </div>
                
                <!-- Show Progress in Tray -->
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-white">Show Progress in Tray</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Display timer progress in system tray tooltip</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="tray-progress-setting" class="sr-only peer" ${this.settings.appearance.showProgressInTray ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500"></div>
                    </label>
                </div>
            </div>
        `;
    }

    renderGeneralSettings() {
        return `
            <div class="space-y-6">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">General Settings</h3>
                </div>
                
                <!-- Start Minimized -->
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-white">Start Minimized</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Start the app minimized to system tray</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="start-minimized" class="sr-only peer" ${this.settings.general.startMinimized ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500"></div>
                    </label>
                </div>
                
                <!-- Close to Tray -->
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-white">Close to System Tray</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Keep app running in tray when window is closed</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="close-to-tray" class="sr-only peer" ${this.settings.general.closeToTray ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500"></div>
                    </label>
                </div>
                
                <!-- Launch on Startup -->
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-white">Launch on System Startup</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Automatically start Focus Soundboard when computer starts</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="launch-on-startup" class="sr-only peer" ${this.settings.general.launchOnStartup ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500"></div>
                    </label>
                </div>
                
                <!-- Data Management -->
                <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <h4 class="font-medium text-gray-900 dark:text-white mb-3">Data Management</h4>
                    <div class="flex space-x-3">
                        <button id="export-data" class="btn-ghost text-sm">
                            <i class="fas fa-download mr-2"></i>Export Data
                        </button>
                        <button id="import-data" class="btn-ghost text-sm">
                            <i class="fas fa-upload mr-2"></i>Import Data
                        </button>
                        <button id="clear-data" class="btn-ghost text-sm text-red-600 dark:text-red-400">
                            <i class="fas fa-trash mr-2"></i>Clear All Data
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderStatsSettings() {
        const timer = window.focusApp.timer;
        const stats = timer ? timer.statistics : { todaySessions: 0, totalSessions: 0, history: [] };
        
        return `
            <div class="space-y-6">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistics</h3>
                </div>
                
                <!-- Today's Stats -->
                <div class="grid grid-cols-3 gap-4">
                    <div class="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">${stats.todaySessions}</div>
                            <div class="text-sm text-primary-700 dark:text-primary-300">Today's Sessions</div>
                        </div>
                    </div>
                    <div class="p-4 bg-success-50 dark:bg-success-900/20 rounded-xl border border-success-200 dark:border-success-800">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-success-600 dark:text-success-400">${stats.totalSessions}</div>
                            <div class="text-sm text-success-700 dark:text-success-300">Total Sessions</div>
                        </div>
                    </div>
                    <div class="p-4 bg-secondary-50 dark:bg-secondary-900/20 rounded-xl border border-secondary-200 dark:border-secondary-800">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-secondary-600 dark:text-secondary-400">${Math.round(stats.totalSessions * 25 / 60)}h</div>
                            <div class="text-sm text-secondary-700 dark:text-secondary-300">Focus Time</div>
                        </div>
                    </div>
                </div>
                
                <!-- Recent Sessions -->
                <div>
                    <h4 class="font-medium text-gray-900 dark:text-white mb-3">Recent Sessions</h4>
                    <div class="max-h-64 overflow-y-auto space-y-2">
                        ${this.renderRecentSessions(stats.history.slice(-10).reverse())}
                    </div>
                </div>
                
                <!-- Reset Stats -->
                <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <h4 class="font-medium text-red-700 dark:text-red-300 mb-2">Reset Statistics</h4>
                    <p class="text-sm text-red-600 dark:text-red-400 mb-3">This will permanently delete all session history and statistics.</p>
                    <button id="reset-stats" class="btn-ghost text-red-600 dark:text-red-400 text-sm">
                        <i class="fas fa-trash mr-2"></i>Reset All Statistics
                    </button>
                </div>
            </div>
        `;
    }

    renderRecentSessions(sessions) {
        if (sessions.length === 0) {
            return '<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No sessions recorded yet</p>';
        }

        return sessions.map(session => {
            const date = new Date(session.completedAt);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const modeIcon = session.mode === 'focus' ? 'fa-brain' : 'fa-coffee';
            const modeColor = session.mode === 'focus' ? 'text-primary-500' : 'text-success-500';
            
            return `
                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <i class="fas ${modeIcon} ${modeColor}"></i>
                        <div>
                            <p class="text-sm font-medium text-gray-900 dark:text-white capitalize">${session.mode.replace('-', ' ')}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">${session.duration} minutes</p>
                        </div>
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400">${timeStr}</span>
                </div>
            `;
        }).join('');
    }

    attachTabSpecificListeners(tabName) {
        switch (tabName) {
            case 'audio':
                this.attachAudioListeners();
                break;
            case 'youtube':
                this.attachYouTubeListeners();
                break;
            case 'appearance':
                this.attachAppearanceListeners();
                break;
            case 'general':
                this.attachGeneralListeners();
                break;
            case 'stats':
                this.attachStatsListeners();
                break;
        }
    }

    attachAudioListeners() {
        // Volume sliders
        const masterVolume = document.getElementById('master-volume');
        const notificationVolume = document.getElementById('notification-volume');
        const masterDisplay = document.getElementById('master-volume-display');
        const notificationDisplay = document.getElementById('notification-volume-display');
        const fadeDuration = document.getElementById('fade-duration');
        const fadeDisplay = document.getElementById('fade-duration-display');

        masterVolume?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            masterDisplay.textContent = `${Math.round(value * 100)}%`;
        });

        notificationVolume?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            notificationDisplay.textContent = `${Math.round(value * 100)}%`;
        });

        fadeDuration?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            fadeDisplay.textContent = `${value}`;
        });

        // Test buttons
        const testNotification = document.getElementById('test-notification');
        const testComplete = document.getElementById('test-complete');

        testNotification?.addEventListener('click', () => {
            window.focusApp.showNotification('Test Notification', 'This is a test notification', 'info');
        });

        testComplete?.addEventListener('click', () => {
            if (window.focusApp.soundboard) {
                window.focusApp.soundboard.playNotificationSound('complete');
            }
        });

        // Custom notification pickers
        document.querySelectorAll('.pick-notif').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const key = e.currentTarget.getAttribute('data-key');
                try {
                    if (window.electronAPI?.showOpenDialog) {
                        const result = await window.electronAPI.showOpenDialog();
                        if (!result.canceled && result.filePaths.length > 0) {
                            const path = result.filePaths[0];
                            const input = document.getElementById(`notif-${key}-path`);
                            if (input) input.value = path;
                        }
                    }
                } catch (err) {
                    console.error('File pick error', err);
                }
            });
        });
        document.querySelectorAll('.clear-notif').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.currentTarget.getAttribute('data-key');
                const input = document.getElementById(`notif-${key}-path`);
                if (input) input.value = '';
            });
        });
    }

    collectAudioSettings() {
        const masterVolume = parseFloat(document.getElementById('master-volume')?.value);
        const notificationVolume = parseFloat(document.getElementById('notification-volume')?.value);
        const muteOnBreaks = document.getElementById('mute-on-breaks')?.checked;
        const fadeDurationMs = parseInt(document.getElementById('fade-duration')?.value);

        if (!isNaN(masterVolume)) this.settings.audio.masterVolume = masterVolume;
        if (!isNaN(notificationVolume)) this.settings.audio.notificationVolume = notificationVolume;
        if (muteOnBreaks !== undefined) this.settings.audio.muteOnBreaks = muteOnBreaks;
        if (!isNaN(fadeDurationMs)) this.settings.audio.fadeDurationMs = fadeDurationMs;

        // Collect custom notifications
        ['complete','break','focus'].forEach(key => {
            const v = document.getElementById(`notif-${key}-path`)?.value || null;
            this.settings.audio.customNotificationSounds[key] = v || null;
        });
    }

    applySettings() {
        // Apply timer settings
        if (window.focusApp.timer) {
            window.focusApp.timer.isADHDMode = this.settings.timer.adhdMode;
            window.focusApp.timer.autoStart = this.settings.timer.autoStart;
            window.focusApp.timer.updateADHDMode();
        }

        // Apply audio settings
        if (window.focusApp.soundboard) {
            window.focusApp.soundboard.setMasterVolume(this.settings.audio.masterVolume);
            window.focusApp.soundboard.fadeDurationMs = this.settings.audio.fadeDurationMs;
            window.focusApp.soundboard.notificationCustom = { ...window.focusApp.soundboard.notificationCustom, ...this.settings.audio.customNotificationSounds };
        }

        // Apply theme settings
        if (this.settings.appearance.theme !== 'auto') {
            window.focusApp.isDarkMode = this.settings.appearance.theme === 'dark';
            window.focusApp.applyTheme();
        }
    }

    resetToDefaults() {
        window.focusApp.ui.showConfirmDialog(
            'Reset Settings',
            'Are you sure you want to reset all settings to their default values?',
            () => {
                this.settings = {
                    timer: {
                        adhdMode: false,
                        autoStart: true,
                        customDurations: { focus: 25, 'short-break': 5, 'long-break': 15 },
                        soundEnabled: true,
                        showNotifications: true
                    },
                    audio: {
                        masterVolume: 1.0,
                        notificationVolume: 0.7,
                        muteOnBreaks: false,
                        fadeDurationMs: 800,
                        customNotificationSounds: { complete: null, break: null, focus: null }
                    },
                    appearance: {
                        theme: 'auto',
                        animations: true,
                        showProgressInTray: true
                    },
                    general: {
                        startMinimized: false,
                        closeToTray: true,
                        launchOnStartup: false
                    }
                };
                this.renderSettingsModal();
                window.focusApp.showNotification('Settings Reset', 'All settings have been reset to defaults', 'success');
            },
            null
        );
    }

    async exportData() {
        try {
            let data = {};
            
            if (this.db) {
                // Use local database
                data = {
                    settings: await this.db.get('settings') || {},
                    timerHistory: await this.db.get('timer.sessionHistory') || [],
                    customSounds: await this.db.get('soundboard.customSounds') || [],
                    soundPresets: await this.db.get('soundboard.presets') || {},
                    youtubeMusic: await this.db.get('youtubeMusic.savedTracks') || [],
                    exportedAt: new Date().toISOString()
                };
            } else {
                // Fallback to old method
                data = {
                    settings: this.settings,
                    timerHistory: await window.focusApp.loadData('session-history', []),
                    customSounds: await window.focusApp.loadData('custom-sounds', []),
                    soundPresets: await window.focusApp.loadData('sound-presets', {}),
                    exportedAt: new Date().toISOString()
                };
            }

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `focus-soundboard-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            window.focusApp.showNotification('Data Exported', 'Your data has been exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            window.focusApp.showNotification('Export Error', 'Failed to export data', 'error');
        }
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            try {
                const file = e.target.files[0];
                if (!file) return;

                const text = await file.text();
                const data = JSON.parse(text);

                // Validate data structure
                if (!data.settings || !data.exportedAt) {
                    throw new Error('Invalid backup file format');
                }

                // Import data
                if (this.db) {
                    // Use local database
                    if (data.settings) await this.db.set('settings', data.settings);
                    if (data.timerHistory) await this.db.set('timer.sessionHistory', data.timerHistory);
                    if (data.customSounds) await this.db.set('soundboard.customSounds', data.customSounds);
                    if (data.soundPresets) await this.db.set('soundboard.presets', data.soundPresets);
                    if (data.youtubeMusic) await this.db.set('youtubeMusic.savedTracks', data.youtubeMusic);
                } else {
                    // Fallback to old method
                    if (data.settings) await window.focusApp.saveData('app-settings', data.settings);
                    if (data.timerHistory) await window.focusApp.saveData('session-history', data.timerHistory);
                    if (data.customSounds) await window.focusApp.saveData('custom-sounds', data.customSounds);
                    if (data.soundPresets) await window.focusApp.saveData('sound-presets', data.soundPresets);
                }

                window.focusApp.showNotification('Data Imported', 'Your data has been imported successfully. Please restart the app.', 'success');
            } catch (error) {
                console.error('Import error:', error);
                window.focusApp.showNotification('Import Error', 'Failed to import data. Please check the file format.', 'error');
            }
        };
        input.click();
    }

    clearAllData() {
        window.focusApp.ui.showConfirmDialog(
            'Clear All Data',
            'This will permanently delete all your settings, session history, custom sounds, and presets. This action cannot be undone.',
            async () => {
                try {
                    if (this.db) {
                        // Use local database - clear all data
                        await this.db.clear();
                    } else if (window.electronAPI) {
                        // Fallback to old Electron store method
                        await window.electronAPI.store.delete('app-settings');
                        await window.electronAPI.store.delete('session-history');
                        await window.electronAPI.store.delete('custom-sounds');
                        await window.electronAPI.store.delete('sound-presets');
                        await window.electronAPI.store.delete('timer-settings');
                    } else {
                        localStorage.clear();
                    }
                    
                    window.focusApp.showNotification('Data Cleared', 'All data has been cleared. Please restart the app.', 'success');
                } catch (error) {
                    console.error('Clear data error:', error);
                    window.focusApp.showNotification('Clear Error', 'Failed to clear data', 'error');
                }
            },
            null
        );
    }

    resetStatistics() {
        if (window.focusApp.timer) {
            window.focusApp.timer.sessionHistory = [];
            window.focusApp.timer.completedSessions = 0;
            window.focusApp.timer.saveSettings();
            window.focusApp.timer.updateSessionCount();
            
            // Re-render stats tab
            this.showSettingsTab('stats');
            
            window.focusApp.showNotification('Statistics Reset', 'All statistics have been reset', 'success');
        }
    }

    async searchYouTubeMusic() {
        const searchInput = document.getElementById('youtube-search');
        const resultsDiv = document.getElementById('youtube-results');
        const resultsList = document.getElementById('youtube-results-list');
        
        if (!searchInput || !searchInput.value.trim()) {
            window.focusApp.showNotification('Search Required', 'Please enter a search term', 'warning');
            return;
        }
        
        const query = searchInput.value.trim();
        
        try {
            // Show loading
            resultsList.innerHTML = `
                <div class="flex items-center justify-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    <span class="ml-3 text-gray-600 dark:text-gray-400">Searching YouTube Music...</span>
                </div>
            `;
            resultsDiv.classList.remove('hidden');
            
            // Search YouTube Music
            if (!window.focusApp.youtubeMusic || !window.focusApp.youtubeMusic.isInitialized) {
                throw new Error('YouTube Music not initialized');
            }
            
            const songs = await window.focusApp.youtubeMusic.search(query, 'songs', 10);
            
            if (songs && songs.length > 0) {
                const filteredSongs = window.focusApp.youtubeMusic.filterAndSortResults(songs, query);
                
                resultsList.innerHTML = filteredSongs.map(song => `
                    <div class="youtube-result-item flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" data-video-id="${song.videoId}">
                        <div class="flex items-center space-x-3 flex-1 min-w-0">
                            <img src="${song.thumbnails?.[0]?.url || ''}" alt="${song.title}" class="w-12 h-12 rounded object-cover" onerror="this.style.display='none'">
                            <div class="flex-1 min-w-0">
                                <h6 class="font-medium text-gray-900 dark:text-white text-sm truncate">${this.escapeHtml(song.title)}</h6>
                                <p class="text-xs text-gray-600 dark:text-gray-400 truncate">${this.escapeHtml(song.author)}</p>
                                ${song.duration ? `<p class="text-xs text-gray-500 dark:text-gray-500">${window.focusApp.youtubeMusic.formatDuration(song.duration)}</p>` : ''}
                            </div>
                        </div>
                        <button onclick="window.focusApp.settings.addYouTubeTrack('${song.videoId}', '${this.escapeHtml(song.title)}', '${this.escapeHtml(song.author)}')" class="btn-primary text-xs px-3 py-1 ml-3">
                            <i class="fas fa-plus mr-1"></i>Add
                        </button>
                    </div>
                `).join('');
            } else {
                resultsList.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-search text-4xl text-gray-400 mb-4"></i>
                        <p class="text-gray-600 dark:text-gray-400">No results found for "${this.escapeHtml(query)}"</p>
                        <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">Try different keywords or check your spelling</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('YouTube Music search error:', error);
            resultsList.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                    <p class="text-red-600 dark:text-red-400">Error searching YouTube Music</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">${this.escapeHtml(error.message)}</p>
                    <button onclick="window.focusApp.settings.searchYouTubeMusic()" class="btn-ghost text-sm mt-3">
                        <i class="fas fa-redo mr-2"></i>Try Again
                    </button>
                </div>
            `;
        }
    }

    async addYouTubeTrack(videoId, title, author) {
        try {
            console.log(`Attempting to add YouTube track: ${title} by ${author} (${videoId})`);
            
            // Add to soundboard as a YouTube stream
            await window.focusApp.soundboard.addYouTubeSound({
                id: `youtube_${videoId}`,
                name: title,
                title: title,
                author: author,
                category: 'music',
                videoId: videoId,
                icon: 'fab fa-youtube',
                color: 'text-red-500'
            });
            
            window.focusApp.showNotification('YouTube Track Added', `"${title}" added to soundboard. Click play to open in your browser!`, 'success');
            
            // Remove the added track from search results
            this.removeTrackFromSearchResults(videoId);
            
            // Update saved tracks in settings
            this.updateSavedYouTubeTracks();
        } catch (error) {
            console.error('Error adding YouTube track:', error);
            
            // Since we're using a simpler browser-based approach, most "errors" shouldn't prevent adding
            window.focusApp.showNotification('Track Added', `"${title}" added to soundboard. Videos play in your browser.`, 'success');
            
            // Still remove from search results and update UI
            this.removeTrackFromSearchResults(videoId);
            this.updateSavedYouTubeTracks();
        }
    }

    async updateSavedYouTubeTracks() {
        const savedTracksDiv = document.getElementById('saved-youtube-tracks');
        if (!savedTracksDiv) return;
        
        try {
            const savedTracks = window.focusApp.youtubeMusic.getSavedTracks();
            
            if (savedTracks.length === 0) {
                savedTracksDiv.innerHTML = '<p class="text-gray-600 dark:text-gray-400 text-sm">No tracks saved yet. Search and add tracks above.</p>';
                return;
            }
            
            savedTracksDiv.innerHTML = savedTracks.map(track => `
                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div class="flex items-center space-x-3 flex-1 min-w-0">
                        <img src="${track.thumbnail}" alt="${track.title}" class="w-10 h-10 rounded object-cover" onerror="this.style.display='none'">
                        <div class="flex-1 min-w-0">
                            <h6 class="font-medium text-gray-900 dark:text-white text-sm truncate">${this.escapeHtml(track.title)}</h6>
                            <p class="text-xs text-gray-600 dark:text-gray-400 truncate">${this.escapeHtml(track.author)}</p>
                        </div>
                    </div>
                    <button onclick="window.focusApp.settings.removeYouTubeTrack('${track.id}')" class="btn-ghost text-red-600 dark:text-red-400 text-xs px-2 py-1">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error updating saved tracks:', error);
            savedTracksDiv.innerHTML = '<p class="text-red-600 dark:text-red-400 text-sm">Error loading saved tracks</p>';
        }
    }

    async removeYouTubeTrack(trackId) {
        try {
            await window.focusApp.youtubeMusic.removeTrack(trackId);
            window.focusApp.soundboard.removeYouTubeSound(`youtube_${trackId}`);
            this.updateSavedYouTubeTracks();
            window.focusApp.showNotification('Track Removed', 'YouTube track removed from soundboard', 'info');
        } catch (error) {
            console.error('Error removing YouTube track:', error);
            window.focusApp.showNotification('Error', 'Failed to remove track', 'error');
        }
    }

    removeTrackFromSearchResults(videoId) {
        try {
            // Find and remove the track from the search results DOM
            const searchResultsContainer = document.getElementById('youtube-results-list');
            if (searchResultsContainer) {
                // Find all result items and remove the one matching this videoId
                const resultItems = searchResultsContainer.querySelectorAll('[data-video-id], .youtube-result-item');
                
                resultItems.forEach(item => {
                    // Check if this item contains a button with the matching videoId
                    const addButton = item.querySelector(`button[onclick*="${videoId}"]`);
                    if (addButton) {
                        // Replace the item with a "Already Added" message
                        item.innerHTML = `
                            <div class="flex items-center justify-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <div class="flex items-center space-x-3">
                                    <i class="fas fa-check-circle text-green-500"></i>
                                    <span class="text-green-700 dark:text-green-300 text-sm font-medium">Added to Soundboard</span>
                                </div>
                            </div>
                        `;
                        
                        // Optionally, remove the item completely after a short delay
                        setTimeout(() => {
                            if (item.parentNode) {
                                item.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                                item.style.opacity = '0';
                                item.style.transform = 'translateX(100%)';
                                setTimeout(() => {
                                    if (item.parentNode) {
                                        item.remove();
                                    }
                                }, 300);
                            }
                        }, 1500);
                    }
                });
            }
        } catch (error) {
            console.error('Error removing track from search results:', error);
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
    }

    // Public API
    get currentSettings() {
        return this.settings;
    }
}