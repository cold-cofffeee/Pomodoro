// Pomodoro Timer Class
class PomodoroTimer {
    constructor() {
        this.db = null;
        this.timeRemaining = 0;
        this.totalTime = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.currentMode = 'focus';
        this.interval = null;
        this.isADHDMode = false;
        this.completedSessions = 0;
        this.autoStart = true;
        this.sessionHistory = [];
        
        // Timer modes and durations (in minutes)
        this.modes = {
            focus: { 
                name: 'Focus Session', 
                duration: 25, 
                adhdDuration: 10,
                icon: 'fas fa-brain',
                color: 'text-primary-500'
            },
            'short-break': { 
                name: 'Short Break', 
                duration: 5, 
                adhdDuration: 2,
                icon: 'fas fa-coffee',
                color: 'text-success-500'
            },
            'long-break': { 
                name: 'Long Break', 
                duration: 15, 
                adhdDuration: 5,
                icon: 'fas fa-couch',
                color: 'text-secondary-500'
            }
        };

        this.motivationalQuotes = [
            "Great job! You're building focus like a muscle. 💪",
            "Amazing focus session! Your brain is getting stronger. 🧠",
            "You did it! Small steps lead to big achievements. 🌟",
            "Fantastic work! You're training your concentration. 🎯",
            "Well done! Every session counts towards your goals. 🚀",
            "Excellent! You're developing a powerful focus habit. ⚡",
            "Superb session! Your productivity is on fire. 🔥",
            "Outstanding! You're mastering the art of deep work. 🎨",
            "Brilliant! Your mind is becoming more disciplined. 🏆",
            "Perfect! You're building unstoppable momentum. 🌊"
        ];
        this._rafId = null;
        this._lastTickAt = null;
    }

    async init() {
        console.log('Initializing Pomodoro Timer...');
        
        // Initialize local database
        if (window.LocalDatabase) {
            this.db = new window.LocalDatabase();
            await this.db.init();
        }
        
        await this.loadSettings();
        this.setupEventListeners();
        this.updateDisplay();
        this.updateSessionCount();
        this._startAnimationLoop();
    }

    _startAnimationLoop() {
        const animate = (ts) => {
            // Smoothly animate progress circle while running
            if (this.isRunning && this.totalTime > 0) {
                const progress = ((this.totalTime - this.timeRemaining) / this.totalTime) * 100;
                window.focusApp.ui.updateProgressCircle(progress);
            }
            this._rafId = requestAnimationFrame(animate);
        };
        this._rafId = requestAnimationFrame(animate);
    }

    async loadSettings() {
        try {
            let settings = {};
            let sessionHistory = [];
            
            if (this.db) {
                // Use local database
                settings = await this.db.get('timer.settings') || {};
                sessionHistory = await this.db.get('timer.sessionHistory') || [];
            } else {
                // Fallback to old Electron store method
                settings = await window.focusApp.loadData('timer-settings', {});
                sessionHistory = await window.focusApp.loadData('session-history', []);
            }
            
            this.isADHDMode = settings.adhdMode || false;
            this.autoStart = settings.autoStart !== undefined ? settings.autoStart : true;
            
            // Load custom durations if set
            if (settings.customDurations) {
                Object.keys(settings.customDurations).forEach(mode => {
                    if (this.modes[mode]) {
                        this.modes[mode].customDuration = settings.customDurations[mode];
                    }
                });
            }
            
            // Load session history
            this.sessionHistory = sessionHistory;
            this.completedSessions = this.getTodaySessions();
            
            // Apply ADHD mode
            this.updateADHDMode();
            
        } catch (error) {
            console.error('Error loading timer settings:', error);
        }
    }

    async saveSettings() {
        try {
            const customDurations = {};
            Object.keys(this.modes).forEach(mode => {
                if (this.modes[mode].customDuration) {
                    customDurations[mode] = this.modes[mode].customDuration;
                }
            });

            const settings = {
                adhdMode: this.isADHDMode,
                autoStart: this.autoStart,
                customDurations: customDurations
            };
            
            if (this.db) {
                // Use local database
                await this.db.set('timer.settings', settings);
                await this.db.set('timer.sessionHistory', this.sessionHistory);
            } else {
                // Fallback to old Electron store method
                await window.focusApp.saveData('timer-settings', settings);
                await window.focusApp.saveData('session-history', this.sessionHistory);
            }
        } catch (error) {
            console.error('Error saving timer settings:', error);
        }
    }

    setupEventListeners() {
        // Timer control buttons
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const stopBtn = document.getElementById('stop-btn');

        if (startBtn) {
            startBtn.addEventListener('click', () => this.start());
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pause());
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stop());
        }

        // Mode buttons
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                const duration = parseInt(btn.dataset.duration);
                this.setMode(mode, duration);
            });
        });

        // ADHD mode toggle
        const adhdToggle = document.getElementById('adhd-mode');
        if (adhdToggle) {
            adhdToggle.checked = this.isADHDMode;
            adhdToggle.addEventListener('change', (e) => {
                this.isADHDMode = e.target.checked;
                this.updateADHDMode();
                this.saveSettings();
            });
        }
    }

    updateADHDMode() {
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            const mode = btn.dataset.mode;
            if (this.modes[mode]) {
                const duration = this.isADHDMode ? 
                    this.modes[mode].adhdDuration : 
                    (this.modes[mode].customDuration || this.modes[mode].duration);
                
                btn.dataset.duration = duration;
                const span = btn.querySelector('span');
                if (span) {
                    const modeName = mode.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                    span.textContent = `${modeName} (${duration}m)`;
                }
            }
        });

        // Update current timer if not running
        if (!this.isRunning) {
            this.setMode(this.currentMode);
        }
    }

    setMode(mode, customDuration = null) {
        if (!this.modes[mode]) return;

        this.currentMode = mode;
        
        let duration;
        if (customDuration) {
            duration = customDuration;
        } else if (this.isADHDMode) {
            duration = this.modes[mode].adhdDuration;
        } else {
            duration = this.modes[mode].customDuration || this.modes[mode].duration;
        }

        this.totalTime = duration * 60; // Convert to seconds
        this.timeRemaining = this.totalTime;
        
        this.updateDisplay();
        this.updateModeButtons();
    }

    updateModeButtons() {
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            if (btn.dataset.mode === this.currentMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    start() {
        if (this.timeRemaining <= 0) {
            this.setMode(this.currentMode);
        }

        this.isRunning = true;
        this.isPaused = false;
        
        this.interval = setInterval(() => {
            this.tick();
        }, 1000);

        this.updateControls();
    this.updateStatus('Running');
    try { window.focusApp.ui && window.focusApp.ui.setProgressActive(true); } catch (e) {}
        this.updateTrayTooltip();
        this._emitState('Running');
        
        window.focusApp.showNotification(
            'Timer Started', 
            `${this.modes[this.currentMode].name} session started!`,
            'info'
        );
    }

    pause() {
        this.isRunning = false;
        this.isPaused = true;
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        this.updateControls();
        this.updateStatus('Paused');
        try { window.focusApp.ui && window.focusApp.ui.setProgressActive(false); } catch (e) {}
        this.updateTrayTooltip();
        this._emitState('Paused');
    }

    stop() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        this.setMode(this.currentMode);
        this.updateControls();
    this.updateStatus('Stopped');
    try { window.focusApp.ui && window.focusApp.ui.setProgressActive(false); } catch (e) {}
        this.updateTrayTooltip();
        this._emitState('Stopped');
        
        window.focusApp.showNotification(
            'Timer Stopped', 
            'Session ended manually',
            'info'
        );
    }

    _emitState(statusOverride = null) {
        try {
            const state = {
                timeRemaining: this.timeRemaining,
                totalTime: this.totalTime,
                mode: this.currentMode,
                modeName: this.modes[this.currentMode]?.name || '',
                isRunning: this.isRunning,
                isPaused: this.isPaused,
                formatted: this.formatTime(this.timeRemaining),
                status: statusOverride || (this.isRunning ? 'Running' : (this.isPaused ? 'Paused' : 'Idle'))
            };
            if (window.electronAPI && window.electronAPI.sendTimerState) {
                window.electronAPI.sendTimerState(state);
            }
        } catch (e) {
            // ignore
        }
    }

    tick() {
        this.timeRemaining--;
        this.updateDisplay();
        this.updateTrayTooltip();
        if (this.timeRemaining <= 0) {
            this.complete();
        } else {
            this._emitState('Running');
        }
    }

    complete() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        // Record completed session
        this.recordSession();
        
        // Show completion notification
        this.showCompletionNotification();
        
        // Auto-start next session if enabled
        if (this.autoStart) {
            this.startNextSession();
        } else {
            this.updateControls();
            this.updateStatus('Complete');
            try { window.focusApp.ui && window.focusApp.ui.setProgressActive(false); } catch (e) {}
        }
        this._emitState('Complete');
    }

    recordSession() {
        const session = {
            mode: this.currentMode,
            duration: Math.floor(this.totalTime / 60),
            completedAt: new Date().toISOString(),
            date: new Date().toDateString()
        };
        
        this.sessionHistory.push(session);
        
        // Keep only last 30 days of history
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        this.sessionHistory = this.sessionHistory.filter(s => 
            new Date(s.completedAt) > thirtyDaysAgo
        );
        
        if (this.currentMode === 'focus') {
            this.completedSessions++;
        }
        
        this.updateSessionCount();
        this.saveSettings();
    }

    showCompletionNotification() {
        const randomQuote = this.motivationalQuotes[Math.floor(Math.random() * this.motivationalQuotes.length)];
        const mode = this.modes[this.currentMode];
        
        window.focusApp.showNotification(
            `${mode.name} Complete!`,
            randomQuote,
            'success'
        );

        // Play completion sound if available
        if (window.focusApp.soundboard) {
            window.focusApp.soundboard.playNotificationSound('complete');
        }
    }

    startNextSession() {
        // Determine next session type
        let nextMode;
        if (this.currentMode === 'focus') {
            // After focus: short break (or long break every 4 sessions)
            nextMode = (this.completedSessions % 4 === 0) ? 'long-break' : 'short-break';
        } else {
            // After any break: focus
            nextMode = 'focus';
        }
        
        this.setMode(nextMode);
        
        // Small delay before auto-starting
        setTimeout(() => {
            this.start();
        }, 2000);
    }

    updateDisplay() {
        const timerDisplay = document.getElementById('timer-display');
        const timerMode = document.getElementById('timer-mode');
        
        if (timerDisplay) {
            timerDisplay.textContent = this.formatTime(this.timeRemaining);
        }
        
        if (timerMode) {
            timerMode.textContent = this.modes[this.currentMode].name;
        }

        // Update progress circle
        if (this.totalTime > 0) {
            const progress = ((this.totalTime - this.timeRemaining) / this.totalTime) * 100;
            window.focusApp.ui.updateProgressCircle(progress);
        }
        // emit state for mini window
        this._emitState();
    }

    updateControls() {
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        
        if (this.isRunning) {
            startBtn?.classList.add('hidden');
            pauseBtn?.classList.remove('hidden');
        } else {
            startBtn?.classList.remove('hidden');
            pauseBtn?.classList.add('hidden');
        }
    }

    updateStatus(status) {
        const timerStatus = document.getElementById('timer-status');
        if (timerStatus) {
            timerStatus.textContent = status;
        }
    }

    updateSessionCount() {
        const sessionsCompleted = document.getElementById('sessions-completed');
        if (sessionsCompleted) {
            sessionsCompleted.textContent = `${this.completedSessions} sessions today`;
        }
    }

    updateTrayTooltip() {
        if (window.electronAPI?.updateTrayTooltip) {
            let tooltip = 'Focus Soundboard';
            if (this.isRunning) {
                tooltip += ` - ${this.modes[this.currentMode].name}: ${this.formatTime(this.timeRemaining)}`;
            }
            window.electronAPI.updateTrayTooltip(tooltip);
        }
    }

    getTodaySessions() {
        const today = new Date().toDateString();
        return this.sessionHistory.filter(s => 
            s.date === today && s.mode === 'focus'
        ).length;
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Public API methods for external access
    startFocus() {
        this.setMode('focus');
        this.start();
    }

    startBreak() {
        const nextBreak = (this.completedSessions % 4 === 0) ? 'long-break' : 'short-break';
        this.setMode(nextBreak);
        this.start();
    }

    // Getters for external access
    get isTimerRunning() {
        return this.isRunning;
    }

    get currentSession() {
        return {
            mode: this.currentMode,
            timeRemaining: this.timeRemaining,
            totalTime: this.totalTime,
            isRunning: this.isRunning,
            isPaused: this.isPaused
        };
    }

    get statistics() {
        return {
            todaySessions: this.completedSessions,
            totalSessions: this.sessionHistory.filter(s => s.mode === 'focus').length,
            history: this.sessionHistory
        };
    }
}