# 🧠 Focus Soundboard - ADHD-Friendly Pomodoro Timer

A modern, high-quality desktop application that combines a customizable Pomodoro timer with an ambient soundboard, specifically designed for ADHD-friendly focus sessions.

![Focus Soundboard Banner](https://via.placeholder.com/800x400/3b82f6/ffffff?text=Focus+Soundboard)

## ✨ Features

### 🎯 Smart Pomodoro Timer
- **Traditional Pomodoro**: 25-minute focus sessions with 5/15-minute breaks
- **ADHD Mode**: Shorter, customizable sessions (10-minute focus, 2-minute breaks)
- **Visual Progress**: Beautiful circular progress indicator with animations
- **Auto-Cycling**: Automatically transitions between focus and break sessions
- **Session Tracking**: Counts completed sessions and tracks productivity
- **Motivational Quotes**: Random encouraging messages after each session

### 🎵 Ambient Soundboard
- **Drag & Drop Import**: Easily add your own audio files (MP3, WAV, OGG, AAC, M4A)
- **Multiple Simultaneous Playback**: Layer different ambient sounds
- **Individual Controls**: Volume sliders and loop toggles for each sound
- **Sound Categories**: Nature, Ambient, Music, Affirmations
- **Preset System**: Save and load your favorite sound combinations
- **Real-time Mixing**: Professional audio mixing with Howler.js

### 🎨 Premium UI/UX
- **Modern Design**: Clean, minimalist interface with premium aesthetics
- **Dark/Light Themes**: Automatic or manual theme switching
- **Smooth Animations**: Glassmorphism effects and fluid transitions
- **Responsive Layout**: Adaptive components for different window sizes
- **Accessibility**: High contrast support and reduced motion options

### ⚙️ Advanced Settings
- **Customizable Durations**: Set your own focus and break times
- **Desktop Notifications**: System notifications with sound alerts
- **Global Shortcuts**: Control timer and sounds from anywhere
- **Data Persistence**: All settings and history saved locally
- **Export/Import**: Backup and restore your data
- **Statistics**: Track your productivity and focus patterns

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone or download** the project:
   ```bash
   git clone https://github.com/your-repo/focus-soundboard-app.git
   cd focus-soundboard-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build CSS** (first time only):
   ```bash
   npm run build-css
   ```

4. **Start the application**:
   ```bash
   npm start
   ```

### Development Mode
For development with hot CSS reloading:
```bash
npm run dev
```

## 📖 Usage Guide

### Getting Started
1. **Launch the app** and familiarize yourself with the interface
2. **Choose your mode**: Enable ADHD mode if you prefer shorter sessions
3. **Add ambient sounds**: Drag and drop audio files or use default sounds
4. **Start focusing**: Click "Start Focus" to begin your first session

### Timer Controls
- **Start/Pause**: Control your focus sessions
- **Mode Switching**: Toggle between Focus, Short Break, and Long Break
- **ADHD Mode**: Enable for 10-minute focus sessions instead of 25
- **Auto-Start**: Automatically begin next session after breaks

### Soundboard Usage
- **Play Multiple Sounds**: Layer different ambient sounds for the perfect focus environment
- **Adjust Volumes**: Fine-tune each sound's volume independently
- **Create Presets**: Save your favorite sound combinations for quick access
- **Categories**: Organize sounds by type (Nature, Ambient, Music, Affirmations)

### Keyboard Shortcuts
- `Ctrl+Shift+F`: Start focus session
- `Ctrl+Shift+B`: Start break
- `Ctrl+Shift+S`: Stop timer
- `Ctrl+Shift+M`: Mute all sounds
- `Ctrl+D`: Toggle dark mode
- `Ctrl+,`: Open settings

## 🏗️ Architecture

### Tech Stack
- **Frontend**: HTML5, CSS3 (Tailwind CSS), Vanilla JavaScript
- **Desktop Framework**: Electron.js
- **Audio Engine**: Howler.js
- **Storage**: electron-store (local JSON files)
- **Icons**: Font Awesome 6

### File Structure
```
focus-soundboard-app/
├── src/
│   ├── assets/
│   │   ├── icons/          # App icons and graphics
│   │   └── sounds/         # Default ambient sounds
│   ├── css/
│   │   ├── input.css       # Tailwind source
│   │   ├── output.css      # Compiled CSS
│   │   └── components.css  # Custom components
│   ├── js/
│   │   ├── app.js          # Main application controller
│   │   ├── timer.js        # Pomodoro timer logic
│   │   ├── soundboard.js   # Audio management
│   │   ├── settings.js     # Settings panel
│   │   └── ui.js           # UI utilities
│   └── index.html          # Main application window
├── main.js                 # Electron main process
├── preload.js              # Secure IPC bridge
├── package.json            # Project configuration
└── tailwind.config.js      # Tailwind configuration
```

### Key Classes

#### `PomodoroTimer`
Manages all timer functionality including:
- Session state management
- Progress tracking
- ADHD mode adaptations
- Auto-cycling logic
- Statistics collection

#### `Soundboard`
Handles audio playback features:
- Sound file management
- Multiple simultaneous playback
- Volume and loop controls
- Preset system
- Drag & drop imports

#### `SettingsManager`
Manages application configuration:
- Persistent settings storage
- Theme management
- Audio preferences
- Data import/export

#### `UIController`
Provides UI utilities:
- Modal management
- Toast notifications
- Theme switching
- Animation helpers

## 🎨 Customization

### Adding Custom Sounds
1. **Drag & Drop**: Simply drag audio files into the soundboard area
2. **File Browser**: Click "Add Sounds" button to browse files
3. **Supported Formats**: MP3, WAV, OGG, AAC, M4A

### Creating Themes
The app uses Tailwind CSS for styling. To create custom themes:

1. Edit `tailwind.config.js` to add new color schemes
2. Update CSS variables in `src/css/input.css`
3. Rebuild CSS with `npm run build-css`

### Custom Timer Durations
- Access settings panel (Ctrl+, or gear icon)
- Navigate to Timer section
- Set custom durations for focus and break sessions
- Enable ADHD mode for pre-configured shorter sessions

## 📱 Building for Distribution

### Build for Current Platform
```bash
npm run build
```

### Platform-Specific Builds
```bash
npm run build-win     # Windows
npm run build-mac     # macOS
npm run build-linux   # Linux
```

### Output
Built applications will be available in the `dist/` directory.

## 🔧 Configuration

### Environment Variables
Create a `.env` file for custom configuration:
```env
# Development settings
ELECTRON_IS_DEV=true
ENABLE_DEV_TOOLS=true

# Audio settings
DEFAULT_VOLUME=0.7
NOTIFICATION_VOLUME=0.5

# Timer defaults
DEFAULT_FOCUS_DURATION=25
DEFAULT_SHORT_BREAK=5
DEFAULT_LONG_BREAK=15
```

### Advanced Configuration
Edit `main.js` to customize:
- Window size and behavior
- Menu structure
- Global shortcuts
- System tray options

## 🐛 Troubleshooting

### Common Issues

#### App Won't Start
- Ensure Node.js v16+ is installed
- Run `npm install` to install dependencies
- Check for antivirus software blocking Electron

#### Audio Not Playing
- Verify audio files are in supported formats
- Check system audio permissions
- Try different audio files to isolate codec issues

#### Settings Not Saving
- Check file system permissions
- Ensure app has write access to user data directory
- Try running as administrator (Windows)

#### Performance Issues
- Disable animations in settings for low-end devices
- Reduce number of simultaneous audio streams
- Close other resource-intensive applications

### Debug Mode
Run in development mode for detailed logging:
```bash
npm run dev
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use ESLint configuration provided
- Follow JavaScript ES6+ standards
- Comment complex logic
- Maintain consistent indentation

### Testing
```bash
# Run linting
npm run lint

# Test build process
npm run build

# Test all platforms (if available)
npm run test-build
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Tailwind CSS** for the beautiful utility-first styling framework
- **Howler.js** for robust audio playback capabilities
- **Electron** for enabling cross-platform desktop development
- **Font Awesome** for the comprehensive icon library
- **Pomodoro Technique** created by Francesco Cirillo

## 📞 Support

- **Documentation**: Check this README and code comments
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join community discussions for feature requests
- **Email**: Contact [your-email@example.com] for direct support

## 🗺️ Roadmap

### Version 2.0 (Planned)
- [ ] Cloud sync for settings and statistics
- [ ] AI-powered focus recommendations
- [ ] Gamification with achievements and streaks
- [ ] Team/collaborative focus sessions
- [ ] Integration with calendar apps
- [ ] Advanced analytics dashboard

### Version 1.1 (Next Release)
- [ ] Plugin system for custom sounds
- [ ] Spotify/Apple Music integration
- [ ] Enhanced accessibility features
- [ ] Mobile companion app
- [ ] Custom notification sounds

---

**Built with ❤️ for improved focus and productivity**

*Perfect for developers, students, creators, and anyone looking to enhance their concentration with ADHD-friendly tools.*