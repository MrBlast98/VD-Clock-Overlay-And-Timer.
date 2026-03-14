# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2026-03-14

### Added
- **Auto-Update Popout Maps**: When map overlay windows are popped out, they now automatically update when you switch maps in the main window
  - Real-time map synchronization across all popout windows
  - Each popout maintains its own window state while staying in sync
  - Seamless experience when multitasking with multiple maps

## [1.0.0] - 2026-03-14

### Added
- **Global System-Wide Hotkeys**: Control timer from anywhere, even while in-game
  - Arrow Left/Right to switch between players
  - Space to toggle active player timer
  - R to reset timers and scores
  - Fully customizable hotkey bindings
  
- **Dual-Player 1V1 Timer**:
  - Independent timers for each player
  - Real-time score tracking
  - Auto-scoring when both players finish their turn
  - Separate start/stop controls per player
  
- **Customizable Hotkey System**:
  - Rebind hotkeys directly in the UI
  - Persistent storage across sessions
  - Reset to default at any time
  - Hot-swap hotkey updates
  
- **Pop-Out Timer Window**:
  - Draggable overlay timer
  - Synchronized state with main window
  - Transparent background mode
  - Always-on-top option
  
- **Dynamic Color Customization**:
  - 7 neon color options
  - Real-time color switching
  - Persistent color preferences
  
- **Clock Map Overlay System**:
  - 7 pre-loaded Violence District clock maps
  - Draggable map display windows
  - Color filters for better visibility

### Features
- Millisecond-precision timing with 10ms update intervals
- Auto-saving player names, scores, and preferences
- Clean, cyberpunk-themed UI
- Windows 7+ compatibility
- Lightweight Electron-based application

### Technical
- Electron 31.0.0
- Global shortcut registration via Electron API
- IPC communication between main and pop-out windows
- localStorage-based preferences
- Real-time state synchronization

---

## Planned Features
- [ ] Custom logo branding
- [ ] Match recording/replay system
- [ ] Multi-language support
- [ ] Tournament mode with bracket tracking
- [ ] Statistics and history tracking
