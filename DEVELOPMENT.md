# Development Guide for Focus Soundboard

## 🏗️ Architecture Overview

The Focus Soundboard app follows a modular architecture with clear separation of concerns:

### Main Process (Electron)
- **main.js**: Entry point, window management, system integration
- **preload.js**: Secure IPC bridge between main and renderer processes

### Renderer Process (Frontend)
- **app.js**: Main application controller and initialization
- **timer.js**: Pomodoro timer logic and state management
- **soundboard.js**: Audio playback and sound management
- **settings.js**: Configuration management and persistence
- **ui.js**: UI utilities and common interface functions

## 🔧 Development Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Git
- Code editor (VS Code recommended)

### Getting Started
```bash
# Clone the repository
git clone <your-repo-url>
cd focus-soundboard-app

# Install dependencies
npm install

# Build CSS (first time)
npm run build-css

# Start development mode
npm run dev
```

### Development Scripts
```bash
# Development with hot CSS reload
npm run dev

# Build CSS only
npm run build-css

# Watch CSS changes
npm run watch-css

# Start production build
npm start

# Build for distribution
npm run build
```

## 🎨 UI Development

### Styling System
The app uses **Tailwind CSS** with custom components:

- **Base styles**: `src/css/input.css`
- **Components**: `src/css/components.css`
- **Configuration**: `tailwind.config.js`

### Adding New Components
1. Define styles in `src/css/components.css`
2. Use Tailwind classes with `@apply` directive
3. Rebuild CSS: `npm run build-css`

### Theme System
Themes are managed through CSS classes:
- Light mode: Default styles
- Dark mode: `.dark` class applied to `<html>`
- Auto mode: Follows system preference

## 🎵 Audio System

### Howler.js Integration
The soundboard uses Howler.js for robust audio playback:

```javascript
// Creating a new sound
const sound = new Howl({
    src: [audioUrl],
    loop: true,
    volume: 0.5,
    onload: () => console.log('Sound loaded'),
    onloaderror: (id, error) => console.error('Load error:', error)
});

// Playing/stopping
sound.play();
sound.stop();
```

### Sound Management
- **File Support**: MP3, WAV, OGG, AAC, M4A
- **Multiple Playback**: Layer multiple sounds simultaneously
- **Volume Control**: Individual and master volume controls
- **Loop Management**: Per-sound loop settings

### Adding New Default Sounds
1. Add audio files to `src/assets/sounds/`
2. Update `defaultSounds` array in `soundboard.js`
3. Include metadata (name, category, icon)

## ⏱️ Timer System

### State Management
The timer maintains several key states:
- `timeRemaining`: Current countdown time (seconds)
- `totalTime`: Session duration (seconds)
- `isRunning`: Whether timer is active
- `isPaused`: Whether timer is paused
- `currentMode`: 'focus', 'short-break', 'long-break'

### ADHD Mode
Special mode with shorter durations:
- Focus: 10 minutes (vs 25)
- Short break: 2 minutes (vs 5)
- Long break: 5 minutes (vs 15)

### Adding New Timer Modes
```javascript
// In timer.js, extend the modes object
this.modes = {
    // ... existing modes
    'custom-mode': {
        name: 'Custom Session',
        duration: 30,
        adhdDuration: 15,
        icon: 'fas fa-star',
        color: 'text-yellow-500'
    }
};
```

## 💾 Data Persistence

### Storage System
Uses `electron-store` for persistent data:

```javascript
// Saving data
await window.electronAPI.store.set('key', value);

// Loading data
const data = await window.electronAPI.store.get('key');

// Deleting data
await window.electronAPI.store.delete('key');
```

### Data Structure
- **app-settings**: Global application settings
- **timer-settings**: Timer-specific configuration
- **session-history**: Completed session records
- **custom-sounds**: User-imported audio files
- **sound-presets**: Saved sound combinations

### Adding New Settings
1. Define default values in `SettingsManager`
2. Add UI controls in settings modal
3. Implement save/load logic
4. Apply settings to relevant components

## 🔐 Security & IPC

### Secure Communication
The app uses contextBridge for secure IPC:

```javascript
// preload.js - Expose safe APIs
contextBridge.exposeInMainWorld('electronAPI', {
    store: {
        get: (key) => ipcRenderer.invoke('store-get', key),
        set: (key, value) => ipcRenderer.invoke('store-set', key, value)
    }
});

// renderer - Use exposed APIs
const data = await window.electronAPI.store.get('settings');
```

### Best Practices
- Never expose full Node.js APIs to renderer
- Validate all IPC data
- Use specific handlers for each operation
- Sanitize file paths and user inputs

## 🧪 Testing Strategy

### Manual Testing Checklist
- [ ] Timer starts/stops correctly
- [ ] Audio plays without issues
- [ ] Settings save and persist
- [ ] Dark/light mode switching
- [ ] Drag & drop file import
- [ ] Keyboard shortcuts work
- [ ] System tray integration
- [ ] Notifications display

### Automated Testing (Future)
Consider adding:
- Unit tests for core logic
- Integration tests for IPC
- E2E tests with Spectron/Playwright

## 📦 Building & Distribution

### Build Process
1. **CSS Compilation**: Tailwind processes custom styles
2. **Asset Optimization**: Icons and resources
3. **Electron Packaging**: Platform-specific bundles
4. **Code Signing**: For trusted distribution

### Platform-Specific Considerations

#### Windows
- Icon format: `.ico`
- Installer: NSIS
- Code signing: Authenticode certificate

#### macOS
- Icon format: `.icns`
- Packaging: `.dmg` or `.app`
- Code signing: Apple Developer certificate
- Notarization required for distribution

#### Linux
- Icon format: `.png`
- Packaging: AppImage, DEB, RPM
- Desktop integration files

### Release Process
```bash
# 1. Update version in package.json
npm version patch|minor|major

# 2. Build CSS
npm run build-css

# 3. Build for all platforms
npm run build

# 4. Test built applications
# 5. Create GitHub release
# 6. Upload distribution files
```

## 🎯 Performance Optimization

### Audio Performance
- Use appropriate audio formats (MP3 for size, WAV for quality)
- Implement lazy loading for large audio files
- Manage memory with sound pooling
- Optimize for mobile/low-power devices

### UI Performance
- Use CSS transforms for animations
- Implement virtual scrolling for large lists
- Debounce rapid user interactions
- Minimize DOM manipulations

### Memory Management
- Unload unused audio files
- Clean up event listeners
- Avoid memory leaks in timers
- Profile with Chrome DevTools

## 🐛 Debugging

### Development Tools
```bash
# Enable DevTools in development
ELECTRON_IS_DEV=true npm start

# Debug main process
npm start --inspect-brk

# Debug renderer process
Ctrl+Shift+I in app window
```

### Common Issues
- **Audio not loading**: Check file paths and formats
- **Settings not saving**: Verify electron-store permissions
- **Timer drift**: Use `setInterval` carefully, consider `requestAnimationFrame`
- **Memory leaks**: Monitor with Task Manager/Activity Monitor

### Logging Strategy
```javascript
// Use consistent logging levels
console.log('Info: Normal operation');
console.warn('Warning: Potential issue');
console.error('Error: Something went wrong');

// Add context to logs
console.log('Timer started:', { mode, duration, adhdMode });
```

## 🔮 Extension Points

### Adding New Features

#### Custom Timer Algorithms
Extend the timer system with new algorithms:
- Ultradian rhythms (90-minute cycles)
- Progressive intervals
- Adaptive timing based on performance

#### Advanced Audio Features
- Real-time audio effects (reverb, EQ)
- Binaural beats generation
- Spotify/streaming integration
- Voice guidance and affirmations

#### Analytics & Insights
- Productivity patterns analysis
- Focus quality metrics
- Personalized recommendations
- Export to external tools

#### Collaboration Features
- Shared focus sessions
- Team productivity dashboards
- Social accountability features
- Integration with work tools

### Plugin Architecture
Consider implementing a plugin system:
```javascript
// Plugin interface
class FocusPlugin {
    constructor(app) {
        this.app = app;
    }
    
    activate() {
        // Plugin initialization
    }
    
    deactivate() {
        // Cleanup
    }
}
```

## 📚 Resources

### Documentation
- [Electron Docs](https://www.electronjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Howler.js](https://howlerjs.com/)
- [Pomodoro Technique](https://francescocirillo.com/pages/pomodoro-technique)

### Tools
- [Electron Builder](https://www.electron.build/)
- [Spectron](https://www.electronjs.org/spectron) (E2E testing)
- [electron-reload](https://github.com/yan-foto/electron-reload) (Hot reload)

### Communities
- [Electron Discord](https://discord.gg/electron)
- [r/electronjs](https://reddit.com/r/electronjs)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/electron)

---

Happy coding! 🚀