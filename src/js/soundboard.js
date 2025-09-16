// Soundboard Class for managing ambient sounds
class Soundboard {
    constructor() {
        this.sounds = new Map();
        this.presets = new Map();
        this.activeSounds = new Set();
        this.masterVolume = 1.0;
        this.isMuted = false;
        this.currentCategory = 'all';
        this.soundCategories = ['nature', 'ambient', 'music', 'affirmations'];
        
        // Default sounds (these would be included with the app)
        this.defaultSounds = [
            {
                id: 'rain',
                name: 'Gentle Rain',
                category: 'nature',
                url: 'assets/sounds/rain.mp3',
                icon: 'fas fa-cloud-rain',
                color: 'text-blue-500'
            },
            {
                id: 'forest',
                name: 'Forest Ambience',
                category: 'nature',
                url: 'assets/sounds/forest.mp3',
                icon: 'fas fa-tree',
                color: 'text-green-500'
            },
            {
                id: 'ocean',
                name: 'Ocean Waves',
                category: 'nature',
                url: 'assets/sounds/ocean.mp3',
                icon: 'fas fa-water',
                color: 'text-cyan-500'
            },
            {
                id: 'campfire',
                name: 'Campfire Crackling',
                category: 'nature',
                url: 'assets/sounds/campfire.mp3',
                icon: 'fas fa-fire',
                color: 'text-orange-500'
            },
            {
                id: 'white-noise',
                name: 'White Noise',
                category: 'ambient',
                url: 'assets/sounds/white-noise.mp3',
                icon: 'fas fa-volume-up',
                color: 'text-gray-500'
            },
            {
                id: 'cafe',
                name: 'Coffee Shop',
                category: 'ambient',
                url: 'assets/sounds/cafe.mp3',
                icon: 'fas fa-coffee',
                color: 'text-amber-600'
            }
        ];

        // Initialize notification sounds with error handling
        this.notificationSounds = {};
        this.initializeNotificationSounds();
    }

    async initializeNotificationSounds() {
        const notificationFiles = [
            { key: 'complete', file: 'assets/sounds/notification-complete.mp3' },
            { key: 'break', file: 'assets/sounds/notification-break.mp3' },
            { key: 'focus', file: 'assets/sounds/notification-focus.mp3' }
        ];

        for (const { key, file } of notificationFiles) {
            try {
                // Test if file exists
                const response = await fetch(file, { method: 'HEAD' });
                if (response.ok) {
                    this.notificationSounds[key] = new Howl({
                        src: [file],
                        volume: 0.7,
                        onloaderror: (id, error) => {
                            console.warn(`Notification sound ${key} failed to load:`, error);
                            delete this.notificationSounds[key];
                        }
                    });
                    console.log(`Notification sound loaded: ${key}`);
                } else {
                    console.log(`Notification sound not found: ${key}`);
                }
            } catch (error) {
                console.log(`Notification sound not available: ${key}`);
            }
        }
    }

    async init() {
        console.log('Initializing Soundboard...');
        await this.initializeNotificationSounds();
        await this.loadSounds();
        await this.loadPresets();
        this.setupEventListeners();
        this.setupYouTubeAPIListener();
        this.renderSounds();
        this.renderPresets();
    }

    setupYouTubeAPIListener() {
        // Listen for YouTube API messages
        window.addEventListener('message', (event) => {
            if (event.origin !== 'https://www.youtube.com') return;
            
            try {
                const data = event.data;
                if (typeof data === 'string') {
                    const parsed = JSON.parse(data);
                    if (parsed.event === 'video-progress') {
                        // YouTube is playing, we can send commands
                        console.log('YouTube API ready for commands');
                    }
                }
            } catch (error) {
                // Non-JSON message, ignore
            }
        }, false);
        
        // Setup cleanup on app close
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    // Cleanup method to prevent memory leaks
    cleanup() {
        try {
            // Stop all sounds
            this.stopAllSounds();
            
            // Cleanup all Howl instances
            this.sounds.forEach(sound => {
                if (sound.howl) {
                    sound.howl.unload();
                }
            });
            
            // Cleanup blob URLs
            if (this.blobUrls) {
                this.blobUrls.forEach(url => {
                    URL.revokeObjectURL(url);
                });
                this.blobUrls.clear();
            }
            
            // Clear collections
            this.sounds.clear();
            this.activeSounds.clear();
            
            console.log('Soundboard cleanup completed');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    async loadSounds() {
        try {
            const savedSounds = await window.focusApp.loadData('custom-sounds', []);
            
            // Check if default sound files exist before trying to load them
            console.log('Checking for default sound files...');
            for (const soundData of this.defaultSounds) {
                try {
                    // Test if the file exists by making a HEAD request
                    const response = await fetch(soundData.url, { method: 'HEAD' });
                    if (response.ok) {
                        console.log(`Found default sound: ${soundData.name}`);
                        // Mark as default sound
                        const defaultSoundData = { ...soundData, isDefault: true };
                        this.addSound(defaultSoundData, false);
                    } else {
                        console.log(`Default sound not found: ${soundData.name} (${response.status})`);
                    }
                } catch (error) {
                    console.log(`Default sound not available: ${soundData.name}`);
                    // Don't add the sound if file doesn't exist
                }
            }
            
            // Load custom sounds
            savedSounds.forEach(soundData => {
                this.addSound(soundData, false);
            });
            
            // If no sounds were loaded, show helpful message
            if (this.sounds.size === 0) {
                this.showNoSoundsMessage();
            }
            
        } catch (error) {
            console.error('Error loading sounds:', error);
        }
    }

    async loadPresets() {
        try {
            const savedPresets = await window.focusApp.loadData('sound-presets', {});
            
            Object.entries(savedPresets).forEach(([name, preset]) => {
                this.presets.set(name, preset);
            });
            
        } catch (error) {
            console.error('Error loading presets:', error);
        }
    }

    async saveSounds() {
        try {
            const customSounds = Array.from(this.sounds.values())
                .filter(sound => !sound.isDefault);
            
            await window.focusApp.saveData('custom-sounds', customSounds);
        } catch (error) {
            console.error('Error saving sounds:', error);
        }
    }

    async savePresets() {
        try {
            const presetsObject = Object.fromEntries(this.presets);
            await window.focusApp.saveData('sound-presets', presetsObject);
        } catch (error) {
            console.error('Error saving presets:', error);
        }
    }

    setupEventListeners() {
        // Add sound button
        const addSoundBtn = document.getElementById('add-sound-btn');
        if (addSoundBtn) {
            addSoundBtn.addEventListener('click', () => this.importSounds());
        }

        // Mute all button
        const muteAllBtn = document.getElementById('mute-all-btn');
        if (muteAllBtn) {
            muteAllBtn.addEventListener('click', () => this.toggleMuteAll());
        }

        // Category tabs
        const categoryTabs = document.querySelectorAll('.category-tab');
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const category = tab.dataset.category;
                this.setCategory(category);
            });
        });

        // Save preset button
        const savePresetBtn = document.getElementById('save-preset-btn');
        if (savePresetBtn) {
            savePresetBtn.addEventListener('click', () => this.showSavePresetDialog());
        }

        // Drag and drop
        const dropZone = document.getElementById('drop-zone');
        if (dropZone) {
            // Prevent default browser drag behavior
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            // Add visual feedback for drag and drop
            dropZone.addEventListener('dragenter', this.handleDragEnter.bind(this));
            dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
            dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
            dropZone.addEventListener('drop', this.handleDrop.bind(this));

            // Make drop zone clickable to open file dialog
            dropZone.addEventListener('click', () => {
                this.importSounds();
            });

            console.log('Drag and drop zone initialized successfully');
        } else {
            console.error('Drop zone element not found');
        }

        // Also add drag and drop to document body as fallback
        document.body.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.body.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type.startsWith('audio/') || 
                /\.(mp3|wav|ogg|aac|m4a|flac)$/i.test(file.name)
            );
            
            if (files.length > 0) {
                this.processImportedFiles(files);
            }
        });
    }

    addSound(soundData, save = true) {
        try {
            // Enhanced URL validation for custom files
            if (soundData.isCustomFile && soundData.url.startsWith('blob:')) {
                // Verify blob URL is still valid
                fetch(soundData.url, {method: 'HEAD'})
                    .catch(() => {
                        console.warn(`Blob URL may be invalid: ${soundData.url}`);
                    });
            }

            // Create Howl instance with better error handling
            const howl = new Howl({
                src: [soundData.url],
                loop: true,
                volume: 0.5,
                preload: true,
                html5: soundData.isCustomFile ? true : false, // Use HTML5 for custom files
                format: soundData.isCustomFile ? this.detectFileFormat(soundData.url, soundData.name) : undefined,
                onload: () => {
                    console.log(`Sound loaded successfully: ${soundData.name}`);
                    // Update UI to show sound is ready
                    this.updateSoundCard(soundData.id);
                },
                onloaderror: (id, error) => {
                    console.error(`Error loading sound ${soundData.name}:`, error);
                    // Mark sound as failed and provide user feedback
                    const sound = this.sounds.get(soundData.id);
                    if (sound) {
                        sound.loadFailed = true;
                        this.updateSoundCard(soundData.id);
                    }
                    
                    // Only show notification for custom sounds, not missing default sounds
                    if (!soundData.isDefault) {
                        window.focusApp.showNotification(
                            'Loading Error',
                            `Failed to load "${soundData.name}". The file may be corrupted or unsupported.`,
                            'error'
                        );
                    }
                },
                onplayerror: (id, error) => {
                    console.error(`Playback error for ${soundData.name}:`, error);
                    // Try to unlock audio context and retry
                    howl.once('unlock', () => {
                        howl.play();
                    });
                }
            });

            const sound = {
                ...soundData,
                howl: howl,
                volume: 0.5,
                isPlaying: false,
                isLooped: true,
                isDefault: soundData.isDefault || false,
                isCustomFile: soundData.isCustomFile || false,
                loadFailed: false
            };

            this.sounds.set(soundData.id, sound);
            
            // Track blob URLs for cleanup
            if (soundData.isCustomFile && soundData.url.startsWith('blob:')) {
                if (!this.blobUrls) {
                    this.blobUrls = new Set();
                }
                this.blobUrls.add(soundData.url);
            }
            
            if (save) {
                this.saveSounds();
                this.renderSounds();
            }
            
        } catch (error) {
            console.error(`Error adding sound ${soundData.name}:`, error);
            window.focusApp.showNotification(
                'Add Sound Error',
                `Failed to add "${soundData.name}": ${error.message}`,
                'error'
            );
        }
    }

    // Helper method to detect file format
    detectFileFormat(url, filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const formatMap = {
            'mp3': ['mp3'],
            'wav': ['wav'],
            'ogg': ['ogg'],
            'aac': ['aac'],
            'm4a': ['m4a'],
            'flac': ['flac']
        };
        return formatMap[extension] || ['mp3']; // fallback to mp3
    }

    removeSound(id) {
        const sound = this.sounds.get(id);
        if (sound && !sound.isDefault) {
            try {
                // Stop and cleanup the audio
                if (sound.howl) {
                    sound.howl.stop();
                    sound.howl.unload();
                }
                
                // Cleanup blob URL if it's a custom file
                if (sound.isCustomFile && sound.url && sound.url.startsWith('blob:')) {
                    URL.revokeObjectURL(sound.url);
                    if (this.blobUrls) {
                        this.blobUrls.delete(sound.url);
                    }
                }
                
                this.sounds.delete(id);
                this.activeSounds.delete(id);
                this.saveSounds();
                this.renderSounds();
                
                console.log(`Removed sound: ${sound.name}`);
            } catch (error) {
                console.error(`Error removing sound ${sound.name}:`, error);
                window.focusApp.showNotification(
                    'Removal Error',
                    `Failed to remove "${sound.name}"`,
                    'error'
                );
            }
        }
    }

    playSound(id) {
        const sound = this.sounds.get(id);
        if (sound && !sound.isPlaying) {
            // Check if sound failed to load
            if (sound.loadFailed) {
                window.focusApp.showNotification(
                    'Playback Error',
                    `"${sound.name}" failed to load. Please remove and re-add the file.`,
                    'error'
                );
                return;
            }

            try {
                if (sound.howl.isYouTubeAudio) {
                    // Stop all other YouTube tracks first to prevent multiple music playing
                    this.stopAllYouTubePlayers();
                    
                    // Also stop any other YouTube sounds in our soundboard
                    this.sounds.forEach((otherSound, otherId) => {
                        if (otherId !== id && otherSound.howl.isYouTubeAudio && otherSound.isPlaying) {
                            this.stopSound(otherId);
                        }
                    });
                    
                    this.playYouTubeAudio(sound.videoId);
                } else {
                    // Check if this is a regular Howl instance with state() method
                    if (typeof sound.howl.state === 'function') {
                        // Ensure sound is properly loaded before playing
                        if (sound.howl.state() === 'loading') {
                            console.log(`Waiting for ${sound.name} to load...`);
                            // Wait for sound to load
                            sound.howl.once('load', () => {
                                console.log(`${sound.name} loaded, playing now`);
                                this.playSound(id);
                            });
                            
                            // Add timeout to prevent infinite waiting
                            setTimeout(() => {
                                if (sound.howl.state() === 'loading') {
                                    console.error(`Timeout waiting for ${sound.name} to load`);
                                    sound.loadFailed = true;
                                    this.updateSoundCard(id);
                                    window.focusApp.showNotification(
                                        'Loading Timeout',
                                        `"${sound.name}" took too long to load`,
                                        'error'
                                    );
                                }
                            }, 10000); // 10 second timeout
                            
                            return;
                        }
                        
                        // Check if sound is in a bad state
                        if (sound.howl.state() === 'unloaded') {
                            console.log(`Reloading ${sound.name}...`);
                            sound.howl.load();
                            setTimeout(() => this.playSound(id), 500);
                            return;
                        }
                    }
                    
                    // For custom files, ensure proper volume before playing
                    if (sound.isCustomFile) {
                        const finalVolume = sound.volume * this.masterVolume * (this.isMuted ? 0 : 1);
                        sound.howl.volume(finalVolume);
                    }
                    
                    const playId = sound.howl.play();
                    
                    // Verify playback started
                    if (playId) {
                        console.log(`Successfully started playing: ${sound.name} (ID: ${playId})`);
                    } else {
                        console.warn(`Failed to get play ID for: ${sound.name}`);
                    }
                }
                
                sound.isPlaying = true;
                this.activeSounds.add(id);
                this.updateSoundCard(id);
                
                console.log(`Playing: ${sound.name}`);
            } catch (error) {
                console.error(`Error playing sound ${sound.name}:`, error);
                window.focusApp.showNotification(
                    'Playback Error',
                    `Cannot play "${sound.name}": ${error.message}`,
                    'error'
                );
                
                // Reset playing state
                sound.isPlaying = false;
                this.activeSounds.delete(id);
                this.updateSoundCard(id);
            }
        }
    }

    stopAllSounds() {
        // Stop all regular sounds
        this.sounds.forEach((sound, id) => {
            if (sound.isPlaying) {
                if (sound.howl.isYouTubeAudio) {
                    this.stopYouTubeAudio(sound.videoId);
                } else {
                    sound.howl.stop();
                }
                sound.isPlaying = false;
                this.activeSounds.delete(id);
                this.updateSoundCard(id);
            }
        });
    }

    stopSound(id) {
        const sound = this.sounds.get(id);
        if (sound && sound.isPlaying) {
            if (sound.howl.isYouTubeAudio) {
                this.stopYouTubeAudio(sound.videoId);
            } else {
                sound.howl.stop();
            }
            sound.isPlaying = false;
            this.activeSounds.delete(id);
            this.updateSoundCard(id);
        }
    }

    toggleSound(id) {
        const sound = this.sounds.get(id);
        if (sound) {
            if (sound.isPlaying) {
                this.stopSound(id);
            } else {
                this.playSound(id);
            }
        }
    }

    setSoundVolume(id, volume) {
        const sound = this.sounds.get(id);
        if (sound && !sound.loadFailed) {
            const oldVolume = sound.volume;
            sound.volume = volume;
            const finalVolume = volume * this.masterVolume * (this.isMuted ? 0 : 1);
            
            try {
                if (sound.howl.isYouTubeAudio) {
                    this.setYouTubeAudioVolume(sound.videoId, finalVolume);
                } else {
                    // Primary volume control method
                    sound.howl.volume(finalVolume);
                    
                    // Additional fallback methods for custom files
                    if (sound.isCustomFile) {
                        // Wait for next tick to ensure volume is applied
                        setTimeout(() => {
                            try {
                                // Try alternative volume setting
                                const audioNodes = sound.howl._sounds;
                                if (audioNodes && audioNodes.length > 0) {
                                    audioNodes.forEach(audioNode => {
                                        if (audioNode._node && typeof audioNode._node.volume !== 'undefined') {
                                            audioNode._node.volume = finalVolume;
                                        }
                                    });
                                }
                            } catch (nodeError) {
                                console.warn(`Alternative volume control failed for ${sound.name}:`, nodeError);
                            }
                        }, 10);
                    }
                    
                    console.log(`Volume set for ${sound.name}: ${finalVolume} (user: ${volume}, master: ${this.masterVolume})`);
                }
                
                this.updateSoundCard(id);
                
            } catch (error) {
                console.error(`Error setting volume for ${sound.name}:`, error);
                // Revert volume on error
                sound.volume = oldVolume;
                
                // Try one more fallback approach
                try {
                    if (sound.howl._sounds && sound.howl._sounds[0]) {
                        const audioElement = sound.howl._sounds[0]._node;
                        if (audioElement && typeof audioElement.volume !== 'undefined') {
                            audioElement.volume = finalVolume;
                            sound.volume = volume; // Restore if successful
                            console.log(`Fallback volume control succeeded for ${sound.name}`);
                            this.updateSoundCard(id);
                            return;
                        }
                    }
                } catch (fallbackError) {
                    console.error(`Fallback volume control failed for ${sound.name}:`, fallbackError);
                }
                
                window.focusApp.showNotification(
                    'Volume Control Error',
                    `Cannot adjust volume for "${sound.name}". Try reloading the sound.`,
                    'warning'
                );
            }
        }
    }

    toggleSoundLoop(id) {
        const sound = this.sounds.get(id);
        if (sound) {
            sound.isLooped = !sound.isLooped;
            sound.howl.loop(sound.isLooped);
            this.updateSoundCard(id);
        }
    }

    setMasterVolume(volume) {
        this.masterVolume = volume;
        
        // Update all sounds with proper error handling
        this.sounds.forEach(sound => {
            try {
                const finalVolume = sound.volume * this.masterVolume * (this.isMuted ? 0 : 1);
                
                if (sound.howl.isYouTubeAudio) {
                    // Handle YouTube audio
                    this.setYouTubeAudioVolume(sound.videoId, finalVolume);
                } else {
                    // Apply volume to regular and custom sounds
                    sound.howl.volume(finalVolume);
                    
                    // Additional handling for custom files
                    if (sound.isCustomFile) {
                        const soundId = sound.howl._sounds[0] ? sound.howl._sounds[0]._id : null;
                        if (soundId && sound.howl._audioNode[soundId]) {
                            sound.howl._audioNode[soundId].volume = finalVolume;
                        }
                    }
                }
            } catch (error) {
                console.error(`Error updating master volume for ${sound.name}:`, error);
            }
        });
        
        console.log(`Master volume set to: ${volume}`);
    }

    toggleMuteAll() {
        this.isMuted = !this.isMuted;
        
        const muteBtn = document.getElementById('mute-all-btn');
        const icon = muteBtn?.querySelector('i');
        
        if (this.isMuted) {
            icon?.classList.replace('fa-volume-up', 'fa-volume-mute');
            muteBtn?.classList.add('text-red-500');
        } else {
            icon?.classList.replace('fa-volume-mute', 'fa-volume-up');
            muteBtn?.classList.remove('text-red-500');
        }
        
        // Update all sounds including YouTube
        this.sounds.forEach(sound => {
            const finalVolume = sound.volume * this.masterVolume * (this.isMuted ? 0 : 1);
            
            if (sound.howl.isYouTubeAudio) {
                this.setYouTubeAudioVolume(sound.videoId, finalVolume);
            } else {
                sound.howl.volume(finalVolume);
            }
        });

        window.focusApp.showNotification(
            this.isMuted ? 'All Sounds Muted' : 'Sounds Unmuted',
            this.isMuted ? 'All ambient sounds have been muted' : 'Sound playback restored',
            'info'
        );
    }

    muteAll() {
        if (!this.isMuted) {
            this.toggleMuteAll();
        }
    }

    stopAllSounds() {
        this.activeSounds.forEach(id => {
            this.stopSound(id);
        });
    }

    setCategory(category) {
        this.currentCategory = category;
        
        // Update category tabs
        const categoryTabs = document.querySelectorAll('.category-tab');
        categoryTabs.forEach(tab => {
            if (tab.dataset.category === category) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        this.renderSounds();
    }

    showNoSoundsMessage() {
        const soundsGrid = document.getElementById('sounds-grid');
        if (soundsGrid) {
            soundsGrid.innerHTML = `
                <div class="col-span-3 text-center py-12">
                    <i class="fas fa-music text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">No Sound Files Available</p>
                    <p class="text-sm text-gray-500 dark:text-gray-500 mb-4">
                        Default sound files are not included with the app.<br>
                        You can add your own audio files to get started!
                    </p>
                    <button id="add-sounds-help-btn" class="btn-primary text-sm px-4 py-2">
                        <i class="fas fa-plus mr-2"></i>Add Audio Files
                    </button>
                </div>
            `;
            
            // Add click handler for the help button
            const addSoundsBtn = document.getElementById('add-sounds-help-btn');
            if (addSoundsBtn) {
                addSoundsBtn.addEventListener('click', () => this.importSounds());
            }
        }
    }

    renderSounds() {
        const soundsGrid = document.getElementById('sounds-grid');
        if (!soundsGrid) return;

        soundsGrid.innerHTML = '';

        const filteredSounds = Array.from(this.sounds.values()).filter(sound => {
            return this.currentCategory === 'all' || sound.category === this.currentCategory;
        });

        if (filteredSounds.length === 0) {
            soundsGrid.innerHTML = `
                <div class="col-span-3 text-center py-12">
                    <i class="fas fa-music text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600 dark:text-gray-400 text-lg font-medium">No sounds in this category</p>
                    <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">Add some sounds to get started!</p>
                </div>
            `;
            return;
        }

        filteredSounds.forEach(sound => {
            const soundCard = this.createSoundCard(sound);
            soundsGrid.appendChild(soundCard);
        });
    }

    createSoundCard(sound) {
        const card = document.createElement('div');
        card.className = 'sound-card card p-3 hover:shadow-lg transition-all duration-200';
        card.id = `sound-card-${sound.id}`;
        
        card.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2">
                    <div class="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <i class="${sound.icon} ${sound.color} text-xs"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-medium text-gray-900 dark:text-white text-xs truncate">${sound.name}</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">${sound.category}</p>
                    </div>
                </div>
                ${!sound.isDefault ? `
                    <button class="remove-sound-btn text-gray-400 hover:text-red-500 transition-colors" data-id="${sound.id}">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                ` : ''}
            </div>
            
            <div class="space-y-2">
                <!-- Play/Stop Button -->
                <button class="play-btn w-full ${sound.isPlaying ? 'btn-danger' : 'btn-primary'} text-xs py-1.5" data-id="${sound.id}">
                    <i class="fas ${sound.isPlaying ? 'fa-stop' : 'fa-play'} mr-1"></i>
                    ${sound.isPlaying ? 'Stop' : 'Play'}
                </button>
                
                <!-- Volume Control -->
                <div class="space-y-1">
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-gray-600 dark:text-gray-400">Vol</span>
                        <span class="volume-display text-xs font-mono text-gray-500">${Math.round(sound.volume * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.01" value="${sound.volume}" 
                           class="volume-slider w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer" 
                           data-id="${sound.id}">
                </div>
                
                <!-- Loop Toggle -->
                <label class="flex items-center space-x-1 cursor-pointer">
                    <input type="checkbox" ${sound.isLooped ? 'checked' : ''} 
                           class="loop-toggle sr-only" data-id="${sound.id}">
                    <div class="w-3 h-3 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center ${sound.isLooped ? 'bg-primary-500 border-primary-500' : ''}">
                        ${sound.isLooped ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
                    </div>
                    <span class="text-xs text-gray-600 dark:text-gray-400">Loop</span>
                </label>
            </div>
        `;

        // Add event listeners
        this.attachSoundCardListeners(card, sound);
        
        return card;
    }

    attachSoundCardListeners(card, sound) {
        // Play/Stop button
        const playBtn = card.querySelector('.play-btn');
        playBtn?.addEventListener('click', () => this.toggleSound(sound.id));

        // Volume slider
        const volumeSlider = card.querySelector('.volume-slider');
        volumeSlider?.addEventListener('input', (e) => {
            this.setSoundVolume(sound.id, parseFloat(e.target.value));
        });

        // Loop toggle
        const loopToggle = card.querySelector('.loop-toggle');
        loopToggle?.addEventListener('change', () => this.toggleSoundLoop(sound.id));

        // Remove button
        const removeBtn = card.querySelector('.remove-sound-btn');
        removeBtn?.addEventListener('click', () => {
            window.focusApp.ui.showConfirmDialog(
                'Remove Sound',
                `Are you sure you want to remove "${sound.name}"?`,
                () => this.removeSound(sound.id),
                null
            );
        });
    }

    updateSoundCard(id) {
        const sound = this.sounds.get(id);
        const card = document.getElementById(`sound-card-${id}`);
        if (!sound || !card) return;

        // Update play button
        const playBtn = card.querySelector('.play-btn');
        if (playBtn) {
            const icon = playBtn.querySelector('i');
            const text = playBtn.querySelector('span') || playBtn.childNodes[2];
            
            // Check for error states
            if (sound.loadFailed) {
                playBtn.className = 'play-btn w-full bg-red-500 text-white text-sm py-2 cursor-not-allowed opacity-50';
                icon.className = 'fas fa-exclamation-triangle mr-2';
                if (text) text.textContent = 'Failed';
                playBtn.disabled = true;
            } else if (!sound.howl.isYouTubeAudio && typeof sound.howl.state === 'function' && sound.howl.state() === 'loading') {
                playBtn.className = 'play-btn w-full bg-yellow-500 text-white text-sm py-2 cursor-wait';
                icon.className = 'fas fa-spinner fa-spin mr-2';
                if (text) text.textContent = 'Loading...';
                playBtn.disabled = true;
            } else if (sound.isPlaying) {
                playBtn.className = 'play-btn w-full btn-danger text-sm py-2';
                icon.className = 'fas fa-stop mr-2';
                if (text) text.textContent = 'Stop';
                playBtn.disabled = false;
            } else {
                playBtn.className = 'play-btn w-full btn-primary text-sm py-2';
                icon.className = 'fas fa-play mr-2';
                if (text) text.textContent = 'Play';
                playBtn.disabled = false;
            }
        }

        // Update volume display and controls
        const volumeDisplay = card.querySelector('.volume-display');
        const volumeSlider = card.querySelector('.volume-slider');
        if (volumeDisplay) {
            volumeDisplay.textContent = `${Math.round(sound.volume * 100)}%`;
        }
        if (volumeSlider && !sound.loadFailed) {
            volumeSlider.value = sound.volume;
            volumeSlider.disabled = false;
        } else if (volumeSlider && sound.loadFailed) {
            volumeSlider.disabled = true;
            volumeSlider.style.opacity = '0.5';
        }

        // Update loop toggle
        const loopToggle = card.querySelector('.loop-toggle');
        const loopIndicator = loopToggle?.parentElement.querySelector('div');
        if (loopToggle && loopIndicator) {
            loopToggle.checked = sound.isLooped;
            loopToggle.disabled = sound.loadFailed;
            
            if (sound.isLooped && !sound.loadFailed) {
                loopIndicator.className = 'w-4 h-4 rounded border-2 border-primary-500 bg-primary-500 flex items-center justify-center';
                loopIndicator.innerHTML = '<i class="fas fa-check text-white text-xs"></i>';
            } else {
                loopIndicator.className = `w-4 h-4 rounded border-2 ${sound.loadFailed ? 'border-gray-400' : 'border-gray-300 dark:border-gray-600'} flex items-center justify-center`;
                loopIndicator.innerHTML = '';
            }
        }

        // Add visual indicators for custom files
        if (sound.isCustomFile) {
            const header = card.querySelector('.flex.items-center.justify-between');
            if (header && !header.querySelector('.custom-file-indicator')) {
                const indicator = document.createElement('span');
                indicator.className = 'custom-file-indicator text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded';
                indicator.textContent = 'Custom';
                header.appendChild(indicator);
            }
        }
    }

    async importSounds() {
        if (window.electronAPI?.showOpenDialog) {
            try {
                const result = await window.electronAPI.showOpenDialog();
                if (!result.canceled && result.filePaths.length > 0) {
                    this.processImportedFiles(result.filePaths);
                }
            } catch (error) {
                console.error('Error importing sounds:', error);
                window.focusApp.showNotification('Import Error', 'Failed to import sounds', 'error');
            }
        } else {
            // Fallback for web version
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'audio/*';
            input.onchange = (e) => {
                if (e.target.files.length > 0) {
                    this.processImportedFiles(Array.from(e.target.files));
                }
            };
            input.click();
        }
    }

    processImportedFiles(files) {
        files.forEach(file => {
            try {
                const soundData = {
                    id: this.generateSoundId(),
                    name: this.getFileName(file),
                    category: this.guessCategory(file),
                    url: this.getFileUrl(file),
                    icon: this.getIconForCategory(this.guessCategory(file)),
                    color: this.getColorForCategory(this.guessCategory(file)),
                    isDefault: false,
                    isCustomFile: true
                };
                
                this.addSound(soundData);
            } catch (error) {
                console.error(`Error processing file ${file.name || file}:`, error);
                window.focusApp.showNotification(
                    'Import Error',
                    `Failed to import "${file.name || file}"`,
                    'error'
                );
            }
        });
        
        if (files.length > 0) {
            window.focusApp.showNotification(
                'Sounds Imported',
                `${files.length} sound${files.length > 1 ? 's' : ''} processed`,
                'success'
            );
        }
    }

    generateSoundId() {
        return 'sound_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getFileName(file) {
        const name = typeof file === 'string' ? file.split(/[\\\/]/).pop() : file.name;
        return name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    }

    getFileUrl(file) {
        try {
            if (typeof file === 'string') {
                return file; // Electron file path
            } else {
                // Web File object - create blob URL
                const url = URL.createObjectURL(file);
                console.log(`Created blob URL for ${file.name}: ${url}`);
                return url;
            }
        } catch (error) {
            console.error('Error creating file URL:', error);
            throw new Error(`Cannot create URL for file: ${file.name || file}`);
        }
    }

    guessCategory(file) {
        const filename = (typeof file === 'string' ? file : file.name).toLowerCase();
        
        if (filename.includes('rain') || filename.includes('thunder') || filename.includes('wind') || 
            filename.includes('forest') || filename.includes('bird') || filename.includes('ocean') || 
            filename.includes('water') || filename.includes('nature')) {
            return 'nature';
        } else if (filename.includes('white') || filename.includes('noise') || filename.includes('ambient') || 
                   filename.includes('drone') || filename.includes('hum')) {
            return 'ambient';
        } else if (filename.includes('music') || filename.includes('melody') || filename.includes('piano') || 
                   filename.includes('guitar') || filename.includes('instrumental')) {
            return 'music';
        } else if (filename.includes('affirmation') || filename.includes('meditation') || filename.includes('mantra')) {
            return 'affirmations';
        }
        
        return 'ambient'; // Default category
    }

    getIconForCategory(category) {
        const icons = {
            nature: 'fas fa-leaf',
            ambient: 'fas fa-wave-square',
            music: 'fas fa-music',
            affirmations: 'fas fa-heart'
        };
        return icons[category] || 'fas fa-volume-up';
    }

    getColorForCategory(category) {
        const colors = {
            nature: 'text-green-500',
            ambient: 'text-purple-500',
            music: 'text-pink-500',
            affirmations: 'text-red-500'
        };
        return colors[category] || 'text-gray-500';
    }

    handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const dropZone = document.getElementById('drop-zone');
        dropZone?.classList.add('drag-over');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        
        const dropZone = document.getElementById('drop-zone');
        dropZone?.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Only remove the class if we're actually leaving the drop zone
        if (!e.currentTarget.contains(e.relatedTarget)) {
            const dropZone = document.getElementById('drop-zone');
            dropZone?.classList.remove('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const dropZone = document.getElementById('drop-zone');
        dropZone?.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('audio/') || 
            /\.(mp3|wav|ogg|aac|m4a|flac)$/i.test(file.name)
        );
        
        console.log(`Dropped ${files.length} audio files`);
        
        if (files.length > 0) {
            this.processImportedFiles(files);
        } else {
            window.focusApp.showNotification(
                'Invalid Files',
                'Please drop audio files only (MP3, WAV, OGG, AAC, M4A, FLAC)',
                'warning'
            );
        }
    }

    showSavePresetDialog() {
        const activeIds = Array.from(this.activeSounds);
        if (activeIds.length === 0) {
            window.focusApp.showNotification(
                'No Active Sounds',
                'Play some sounds first to create a preset',
                'warning'
            );
            return;
        }

        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        dialog.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Save Sound Preset</h3>
                <input type="text" id="preset-name" placeholder="Enter preset name..." 
                       class="input-field mb-4" maxlength="50">
                <div class="flex justify-end space-x-3">
                    <button id="cancel-preset" class="btn-ghost">Cancel</button>
                    <button id="save-preset" class="btn-primary">Save Preset</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        const nameInput = dialog.querySelector('#preset-name');
        const cancelBtn = dialog.querySelector('#cancel-preset');
        const saveBtn = dialog.querySelector('#save-preset');

        nameInput.focus();

        const cleanup = () => document.body.removeChild(dialog);

        cancelBtn.addEventListener('click', cleanup);

        saveBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            if (name) {
                this.savePreset(name, activeIds);
                cleanup();
                window.focusApp.showNotification(
                    'Preset Saved',
                    `"${name}" preset saved successfully`,
                    'success'
                );
            }
        });

        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveBtn.click();
            }
        });

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) cleanup();
        });
    }

    savePreset(name, soundIds) {
        const preset = {
            name: name,
            sounds: soundIds.map(id => {
                const sound = this.sounds.get(id);
                return {
                    id: id,
                    volume: sound.volume,
                    isLooped: sound.isLooped
                };
            }),
            createdAt: new Date().toISOString()
        };
        
        this.presets.set(name, preset);
        this.savePresets();
        this.renderPresets();
    }

    loadPreset(name) {
        const preset = this.presets.get(name);
        if (!preset) return;

        // Stop all current sounds
        this.stopAllSounds();

        // Load preset sounds
        preset.sounds.forEach(presetSound => {
            const sound = this.sounds.get(presetSound.id);
            if (sound) {
                this.setSoundVolume(presetSound.id, presetSound.volume);
                sound.isLooped = presetSound.isLooped;
                sound.howl.loop(presetSound.isLooped);
                this.playSound(presetSound.id);
            }
        });

        window.focusApp.showNotification(
            'Preset Loaded',
            `"${name}" preset loaded successfully`,
            'success'
        );
    }

    deletePreset(name) {
        this.presets.delete(name);
        this.savePresets();
        this.renderPresets();
    }

    renderPresets() {
        const presetsList = document.getElementById('presets-list');
        if (!presetsList) return;

        presetsList.innerHTML = '';

        if (this.presets.size === 0) {
            presetsList.innerHTML = `
                <p class="text-sm text-gray-500 dark:text-gray-400">No presets saved yet</p>
            `;
            return;
        }

        this.presets.forEach((preset, name) => {
            const presetBtn = document.createElement('div');
            presetBtn.className = 'flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors';
            presetBtn.innerHTML = `
                <button class="load-preset flex-1 text-left text-sm font-medium text-gray-900 dark:text-white" data-name="${name}">
                    ${name}
                </button>
                <button class="delete-preset text-gray-400 hover:text-red-500 transition-colors" data-name="${name}">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            `;

            const loadBtn = presetBtn.querySelector('.load-preset');
            const deleteBtn = presetBtn.querySelector('.delete-preset');

            loadBtn.addEventListener('click', () => this.loadPreset(name));
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.focusApp.ui.showConfirmDialog(
                    'Delete Preset',
                    `Are you sure you want to delete "${name}" preset?`,
                    () => this.deletePreset(name),
                    null
                );
            });

            presetsList.appendChild(presetBtn);
        });
    }

    playNotificationSound(type) {
        if (this.notificationSounds[type] && !this.isMuted) {
            try {
                this.notificationSounds[type].play();
                console.log(`Playing notification sound: ${type}`);
            } catch (error) {
                console.warn(`Failed to play notification sound ${type}:`, error);
            }
        } else if (!this.notificationSounds[type]) {
            console.log(`Notification sound not available: ${type}`);
            // Could optionally use browser's built-in notification sound or show a visual notification
        }
    }

    // Public API methods
    get activeCount() {
        return this.activeSounds.size;
    }

    get totalSounds() {
        return this.sounds.size;
    }

    async addYouTubeSound(youtubeData) {
        try {
            console.log(`Adding YouTube sound: ${youtubeData.name}`);
            
            // Create a simple YouTube audio URL without trying to get stream data
            // This uses a more basic approach that should work for most videos
            const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeData.videoId}`;
            
            console.log(`Using direct YouTube URL: ${youtubeUrl}`);
            
            // Create sound data object with a placeholder URL
            const soundData = {
                id: youtubeData.id || `youtube_${youtubeData.videoId}`,
                name: youtubeData.name || youtubeData.title,
                url: youtubeUrl,
                category: youtubeData.category || 'music',
                icon: youtubeData.icon || 'fab fa-youtube',
                color: youtubeData.color || 'text-red-500',
                isYouTube: true,
                videoId: youtubeData.videoId,
                author: youtubeData.author,
                mimeType: 'audio/youtube'
            };
            
            // Create a custom audio player for YouTube
            const howl = {
                play: () => this.playYouTubeAudio(soundData.videoId),
                pause: () => this.pauseYouTubeAudio(soundData.videoId),
                stop: () => this.stopYouTubeAudio(soundData.videoId),
                volume: (vol) => this.setYouTubeAudioVolume(soundData.videoId, vol),
                loop: () => true,
                playing: () => this.isYouTubeAudioPlaying(soundData.videoId),
                load: () => Promise.resolve(),
                unload: () => this.removeYouTubeAudio(soundData.videoId),
                on: (event, callback) => {
                    // Store callbacks for events
                    if (!this.youtubeCallbacks) this.youtubeCallbacks = {};
                    if (!this.youtubeCallbacks[soundData.videoId]) this.youtubeCallbacks[soundData.videoId] = {};
                    this.youtubeCallbacks[soundData.videoId][event] = callback;
                },
                isYouTubeAudio: true
            };

            const sound = {
                ...soundData,
                howl: howl,
                volume: 0.5,
                isPlaying: false,
                isLooped: true,
                isDefault: false
            };

            // Add to sounds map
            this.sounds.set(sound.id, sound);
            
            // Save to storage
            await this.saveCustomSounds();
            
            // Update UI
            this.renderSounds();
            
            // Save YouTube track
            await window.focusApp.youtubeMusic.saveTrack({
                videoId: youtubeData.videoId,
                title: youtubeData.name || youtubeData.title,
                author: youtubeData.author,
                thumbnails: youtubeData.thumbnails
            });
            
            return sound;
        } catch (error) {
            console.error('Error adding YouTube sound:', error);
            window.focusApp.showNotification('YouTube Error', `Failed to add "${youtubeData.name || youtubeData.title}"`, 'error');
            throw error;
        }
    }

    async refreshYouTubeStream(soundId) {
        try {
            const sound = this.sounds.find(s => s.id === soundId && s.isYouTube);
            if (!sound) {
                throw new Error('YouTube sound not found');
            }
            
            console.log(`Refreshing YouTube stream for: ${sound.name}`);
            
            // Get new stream URL
            const streamData = await window.focusApp.youtubeMusic.getStreamUrl(sound.videoId);
            
            if (!streamData || !streamData.url) {
                throw new Error('Could not get new stream URL');
            }
            
            // Stop current playback
            const wasPlaying = sound.isPlaying;
            if (wasPlaying) {
                sound.howl.stop();
            }
            
            // Update URL and reload
            sound.url = streamData.url;
            sound.howl._src = [streamData.url];
            sound.howl.load();
            
            // Resume playback if it was playing
            if (wasPlaying) {
                sound.howl.play();
                sound.isPlaying = true;
            }
            
            console.log(`YouTube stream refreshed for: ${sound.name}`);
        } catch (error) {
            console.error('Error refreshing YouTube stream:', error);
            window.focusApp.showNotification('Stream Error', 'Failed to refresh stream', 'error');
        }
    }

    removeYouTubeSound(soundId) {
        const index = this.sounds.findIndex(s => s.id === soundId);
        if (index >= 0) {
            const sound = this.sounds[index];
            
            // Stop and unload the sound
            if (sound.howl) {
                sound.howl.stop();
                sound.howl.unload();
            }
            
            // Remove from active sounds
            this.activeSounds.delete(soundId);
            
            // Remove from sounds array
            this.sounds.splice(index, 1);
            
            // Save and update UI
            this.saveCustomSounds();
            this.renderSounds();
            
            console.log(`Removed YouTube sound: ${sound.name}`);
        }
    }

    get currentState() {
        return {
            activeSounds: Array.from(this.activeSounds),
            masterVolume: this.masterVolume,
            isMuted: this.isMuted,
            currentCategory: this.currentCategory
        };
    }

    // YouTube Audio Player Methods (Simplified Embedded Approach)
    playYouTubeAudio(videoId) {
        console.log(`Playing YouTube audio: ${videoId}`);
        
        // Stop any existing YouTube players first
        this.stopAllYouTubePlayers();
        
        const iframe = this.createYouTubeIframe(videoId);
        if (iframe) {
            // Track as playing
            if (!this.youtubeWindows) this.youtubeWindows = new Map();
            this.youtubeWindows.set(`youtube-${videoId}`, { 
                videoId, 
                playing: true,
                iframe: iframe
            });
        }
    }

    pauseYouTubeAudio(videoId) {
        console.log(`Pausing YouTube audio: ${videoId}`);
        
        // For simplicity, we'll stop and restart when needed
        this.stopYouTubeAudio(videoId);
    }

    stopYouTubeAudio(videoId) {
        console.log(`Stopping YouTube audio: ${videoId}`);
        
        const iframe = document.getElementById(`youtube-iframe-${videoId}`);
        if (iframe) {
            iframe.remove();
        }
        
        // Remove from tracking
        const windowId = `youtube-${videoId}`;
        if (this.youtubeWindows) {
            this.youtubeWindows.delete(windowId);
        }
    }

    stopAllYouTubePlayers() {
        // Stop all YouTube iframes
        const youtubeContainer = document.getElementById('youtube-players-container');
        if (youtubeContainer) {
            youtubeContainer.innerHTML = '';
        }
        
        // Clear all tracking
        if (this.youtubeWindows) {
            this.youtubeWindows.clear();
        }
    }

    setYouTubeAudioVolume(videoId, volume) {
        console.log(`Setting YouTube volume for ${videoId} to ${Math.round(volume * 100)}%`);
        
        // Try multiple approaches for volume control
        const iframe = document.getElementById(`youtube-iframe-${videoId}`);
        const windowId = `youtube-${videoId}`;
        const playerData = this.youtubeWindows?.get(windowId);
        
        if (iframe && iframe.contentWindow) {
            try {
                const youtubeVolume = Math.round(volume * 100);
                
                // Method 1: Try postMessage to YouTube player
                iframe.contentWindow.postMessage(
                    JSON.stringify({
                        event: 'command',
                        func: 'setVolume',
                        args: [youtubeVolume]
                    }), 
                    '*'
                );
                
                // Method 2: Enhanced iframe audio control
                setTimeout(() => {
                    try {
                        if (iframe.contentDocument) {
                            const videos = iframe.contentDocument.querySelectorAll('video');
                            videos.forEach(video => {
                                if (video) {
                                    video.volume = volume;
                                    video.muted = volume === 0;
                                    console.log(`Applied volume ${volume} to video element`);
                                }
                            });
                        }
                    } catch (crossOriginError) {
                        // Expected for cross-origin content
                        console.log('Cross-origin restriction on direct video control');
                    }
                }, 100);
                
                // Method 3: Try to control iframe's audio context
                if (iframe.contentWindow.postMessage) {
                    iframe.contentWindow.postMessage({
                        type: 'setVolume',
                        volume: youtubeVolume,
                        videoId: videoId
                    }, '*');
                }
                
                // Method 4: Store volume for manual application
                if (playerData) {
                    playerData.volume = volume;
                    playerData.lastVolumeUpdate = Date.now();
                }
                
                console.log(`Applied volume ${youtubeVolume}% to YouTube player ${videoId}`);
                
            } catch (error) {
                console.log(`Limited volume control for YouTube player ${videoId}. Volume: ${Math.round(volume * 100)}%`);
                
                // Enhanced fallback with user guidance
                if (volume === 0) {
                    window.focusApp.showNotification(
                        'YouTube Muted', 
                        'YouTube track muted. If audio continues, use browser controls to mute the tab.', 
                        'info'
                    );
                } else if (playerData && Math.abs((playerData.lastNotifiedVolume || 1) - volume) > 0.3) {
                    window.focusApp.showNotification(
                        'Volume Adjusted', 
                        `YouTube volume set to ${Math.round(volume * 100)}%. Note: Browser may limit volume control.`, 
                        'info'
                    );
                    playerData.lastNotifiedVolume = volume;
                }
            }
        } else {
            console.warn(`YouTube iframe not found for ${videoId}`);
        }
    }

    isYouTubeAudioPlaying(videoId) {
        const windowId = `youtube-${videoId}`;
        return this.youtubeWindows?.get(windowId)?.playing || false;
    }

    removeYouTubeAudio(videoId) {
        this.stopYouTubeAudio(videoId);
    }

    createYouTubeIframe(videoId) {
        const iframeId = `youtube-iframe-${videoId}`;
        
        // Create container if it doesn't exist
        let container = document.getElementById('youtube-players-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'youtube-players-container';
            container.style.cssText = 'position: absolute; top: -9999px; left: -9999px; width: 1px; height: 1px; overflow: hidden; opacity: 0; pointer-events: none;';
            document.body.appendChild(container);
        }
        
        // Create iframe with enhanced parameters for API control and proper volume support
        const iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&widgetid=1&disablekb=1&fs=0&iv_load_policy=3`;
        iframe.style.cssText = 'width: 1px; height: 1px; border: none;';
        iframe.allow = 'autoplay; encrypted-media';
        iframe.sandbox = 'allow-scripts allow-same-origin allow-presentation';
        
        // Add error handling
        iframe.onerror = () => {
            console.error(`Failed to load YouTube iframe for ${videoId}`);
            window.focusApp.showNotification('YouTube Error', 'Failed to load video. Try a different track.', 'error');
        };
        
        iframe.onload = () => {
            console.log(`YouTube iframe loaded for ${videoId}`);
            
            // Try to enable volume control after load with multiple attempts
            setTimeout(() => {
                this.initializeYouTubeVolumeControl(videoId);
            }, 1000);
            
            setTimeout(() => {
                this.initializeYouTubeVolumeControl(videoId);
            }, 3000);
            
            setTimeout(() => {
                this.initializeYouTubeVolumeControl(videoId);
            }, 5000);
        };
        
        container.appendChild(iframe);
        
        return iframe;
    }

    initializeYouTubeVolumeControl(videoId) {
        const iframe = document.getElementById(`youtube-iframe-${videoId}`);
        if (iframe && iframe.contentWindow) {
            try {
                // Send listening command to enable API
                iframe.contentWindow.postMessage(
                    JSON.stringify({ event: 'listening' }), 
                    '*'
                );
                
                // Apply current volume settings
                const soundId = `youtube_${videoId}`;
                const sound = this.sounds.get(soundId);
                if (sound) {
                    const currentVolume = sound.volume * this.masterVolume * (this.isMuted ? 0 : 1);
                    this.setYouTubeAudioVolume(videoId, currentVolume);
                }
                
                console.log(`Initialized volume control for YouTube player ${videoId}`);
            } catch (error) {
                console.log(`Volume control initialization limited for ${videoId}`);
            }
        }
    }
}