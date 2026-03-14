# VD Clock Map Overlay - Release Guide

## Current Version: 1.0.1

### 📦 Distribution Package

The `releases/VD-Clock-Map-Overlay-v1.0.1/` folder contains the complete portable application ready for distribution.

**File**: `VD Clock Map Overlay.exe` (180+ MB portable executable)

### 🚀 How to Distribute

#### Option 1: Direct Executable
1. Send users the entire `releases/VD-Clock-Map-Overlay-v1.0.0/` folder
2. Users run `VD Clock Map Overlay.exe` directly
3. No installation needed - fully portable

#### Option 2: Create Installer (Future)
User can create an NSIS installer by running:
```bash
npm install -g nsis
npm run build:win
```
This will create an `.exe` installer in the `dist/` folder.

#### Option 3: Zip Archive
Create a distributable zip:
```bash
Compress-Archive -Path "releases/VD-Clock-Map-Overlay-v1.0.0" -DestinationPath "VD-Clock-Map-Overlay-v1.0.0.zip" -Force
```

### ✅ Release Checklist

- [x] App built and tested
- [x] README with features documented
- [x] CHANGELOG with version history
- [x] Portable executable created
- [x] Source code excluded from distribution
- [x] Global hotkeys implemented and working
- [x] All features functional

### 🎮 System Requirements

- **OS**: Windows 7+ (64-bit)
- **RAM**: 200MB minimum
- **CPU**: Any modern processor
- **Display**: 1280x720 minimum recommended

### 📝 Features Included

✓ Dual-Player 1V1 Timer  
✓ Global Hotkeys (← → Space R)  
✓ Customizable Hotkey Bindings  
✓ Pop-Out Timer Window  
✓ 7 Neon Colors  
✓ Transparent Mode  
✓ Always-On-Top Option  
✓ Real-Time Scoreboard  
✓ Clock Map Overlay (7 maps)  
✓ Auto-Scoring  
✓ Custom Player Names  

### 🔗 GitHub Repository

GitHub: [MrBlast98/VD-Clock-Overlay-And-Timer](https://github.com/MrBlast98/VD-Clock-Overlay-And-Timer)

All source code excluded from public builds by `.gitignore` for documentation-only repository.

### 📥 How Users Install

**Minimal Setup**:
1. Download and extract folder
2. Run `VD Clock Map Overlay.exe`
3. Done! App launches immediately

**Optional Setup** (for best experience):
1. Create desktop shortcut by right-clicking the .exe → "Send to Desktop"
2. Pin to Start Menu for quick access
3. Customize hotkeys in app settings

### 🆘 User Support

Common issues:
- **Hotkeys not working in-game**: Ensure app is running in background
- **App won't start**: Check Windows version (7+), try running as admin
- **Performance**: Close other background apps if experiencing lag

### 📊 Build Information

- **Framework**: Electron 31.0.0
- **Build Tool**: electron-builder 26.8.1
- **Package Size**: ~180 MB executable (all dependencies included)
- **Build Command**: `npm run build:win`

### 🚀 How to Update for Next Release

1. Make changes to source code (.js, .html, .css files)
2. Increment version in `package.json`
3. Update `CHANGELOG.md`
4. Run: `npm run build:win`
5. Copy from `dist/win-unpacked/` to new `releases/VD-Clock-Map-Overlay-vX.X.X/`
6. Commit and push to GitHub

---

**Ready to distribute!** Users can download and run immediately. No installation hassles.
