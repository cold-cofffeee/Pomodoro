// YouTube Music Integration
class YouTubeMusic {
    constructor() {
        this.isInitialized = false;
        this.YTMusic = null;
        this.savedTracks = [];
    }

    async init() {
        try {
            console.log('Initializing YouTube Music integration...');
            
            // Check if we're in Electron environment
            if (!window.electronAPI || !window.electronAPI.youtubeMusic) {
                console.warn('YouTube Music API requires Electron environment');
                this.isInitialized = false;
                return;
            }
            
            // Try to initialize through the main process with a timeout
            const initPromise = window.electronAPI.youtubeMusic.init();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Initialization timeout')), 15000);
            });
            
            this.isInitialized = await Promise.race([initPromise, timeoutPromise]);
            
            if (this.isInitialized) {
                // Load saved tracks
                await this.loadSavedTracks();
                console.log('YouTube Music integration initialized successfully');
            } else {
                console.warn('YouTube Music initialization returned false');
            }
            
        } catch (error) {
            console.error('Failed to initialize YouTube Music:', error.message);
            this.isInitialized = false;
            
            // Show user-friendly error message
            if (window.focusApp && window.focusApp.showNotification) {
                window.focusApp.showNotification(
                    'YouTube Music Unavailable', 
                    'YouTube Music integration could not be initialized. You can still use other soundboard features.', 
                    'warning'
                );
            }
        }
    }

    async search(query, type = 'songs', limit = 20) {
        if (!this.isInitialized) {
            throw new Error('YouTube Music not initialized');
        }

        try {
            console.log(`Searching YouTube Music for: "${query}"`);
            
            // Use Electron's main process to perform the search
            const results = await window.electronAPI.youtubeMusic.search({
                query: query,
                type: type,
                limit: limit
            });

            console.log(`Found ${results.length} results for "${query}"`);
            return results;
        } catch (error) {
            console.error('YouTube Music search error:', error);
            throw error;
        }
    }

    async getStreamUrl(videoId) {
        if (!this.isInitialized) {
            throw new Error('YouTube Music not initialized');
        }

        try {
            console.log(`Getting stream URL for video: ${videoId}`);
            
            const streamUrl = await window.electronAPI.youtubeMusic.getStreamUrl(videoId);
            
            console.log(`Stream URL obtained for: ${videoId}`);
            return streamUrl;
        } catch (error) {
            console.error('Failed to get stream URL:', error);
            throw error;
        }
    }

    async saveTrack(track) {
        try {
            // Add to saved tracks
            const savedTrack = {
                id: track.videoId,
                title: track.title,
                author: track.author,
                thumbnail: track.thumbnails?.[0]?.url || '',
                duration: track.duration,
                videoId: track.videoId,
                savedAt: new Date().toISOString()
            };

            // Check if already saved
            const existingIndex = this.savedTracks.findIndex(t => t.id === savedTrack.id);
            if (existingIndex >= 0) {
                this.savedTracks[existingIndex] = savedTrack;
            } else {
                this.savedTracks.push(savedTrack);
            }

            // Save to persistent storage
            await window.focusApp.saveData('youtube-music-tracks', this.savedTracks);
            
            console.log(`Saved track: ${savedTrack.title}`);
            return savedTrack;
        } catch (error) {
            console.error('Failed to save track:', error);
            throw error;
        }
    }

    async loadSavedTracks() {
        try {
            this.savedTracks = await window.focusApp.loadData('youtube-music-tracks', []);
            console.log(`Loaded ${this.savedTracks.length} saved YouTube Music tracks`);
        } catch (error) {
            console.error('Failed to load saved tracks:', error);
            this.savedTracks = [];
        }
    }

    async removeTrack(trackId) {
        try {
            this.savedTracks = this.savedTracks.filter(t => t.id !== trackId);
            await window.focusApp.saveData('youtube-music-tracks', this.savedTracks);
            console.log(`Removed track: ${trackId}`);
        } catch (error) {
            console.error('Failed to remove track:', error);
            throw error;
        }
    }

    getSavedTracks() {
        return this.savedTracks;
    }

    async createPlaylist(name, trackIds) {
        try {
            const playlist = {
                id: Date.now().toString(),
                name: name,
                tracks: trackIds,
                createdAt: new Date().toISOString()
            };

            // Load existing playlists
            const playlists = await window.focusApp.loadData('youtube-music-playlists', []);
            playlists.push(playlist);
            
            // Save updated playlists
            await window.focusApp.saveData('youtube-music-playlists', playlists);
            
            console.log(`Created playlist: ${name}`);
            return playlist;
        } catch (error) {
            console.error('Failed to create playlist:', error);
            throw error;
        }
    }

    async getPlaylists() {
        try {
            return await window.focusApp.loadData('youtube-music-playlists', []);
        } catch (error) {
            console.error('Failed to load playlists:', error);
            return [];
        }
    }

    // Search suggestions for ambient/focus music
    getDefaultSearchQueries() {
        return [
            'ambient music for focus',
            'lo-fi hip hop study beats',
            'nature sounds for concentration',
            'white noise for productivity',
            'deep focus music',
            'meditation music',
            'rain sounds for studying',
            'forest ambient sounds',
            'cafe background noise',
            'classical music for work',
            'piano instrumental focus',
            'electronic ambient music',
            'brown noise for ADHD',
            'binaural beats concentration',
            'study music playlist'
        ];
    }

    // Helper to format duration
    formatDuration(seconds) {
        if (!seconds) return 'Unknown';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes < 60) {
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
    }

    // Helper to clean up search results
    filterAndSortResults(results, query) {
        return results
            .filter(track => {
                // Filter out shorts and very short tracks
                return track.duration && track.duration > 60;
            })
            .sort((a, b) => {
                // Prioritize tracks with higher view counts or better matches
                const aScore = this.getRelevanceScore(a, query);
                const bScore = this.getRelevanceScore(b, query);
                return bScore - aScore;
            })
            .slice(0, 10); // Limit to top 10 results
    }

    getRelevanceScore(track, query) {
        let score = 0;
        const title = track.title.toLowerCase();
        const author = track.author.toLowerCase();
        const queryLower = query.toLowerCase();
        
        // Title contains query
        if (title.includes(queryLower)) score += 10;
        
        // Author contains query
        if (author.includes(queryLower)) score += 5;
        
        // Prefer longer tracks (good for ambient music)
        if (track.duration > 600) score += 3; // 10+ minutes
        if (track.duration > 1800) score += 2; // 30+ minutes
        
        // Prefer tracks with certain keywords for focus/ambient music
        const focusKeywords = ['ambient', 'focus', 'study', 'meditation', 'relaxing', 'calm', 'peaceful', 'lo-fi', 'instrumental'];
        focusKeywords.forEach(keyword => {
            if (title.includes(keyword) || author.includes(keyword)) {
                score += 2;
            }
        });
        
        return score;
    }
}