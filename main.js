const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let popOutWindows = {};
let timerPopOutWindow = null;
let mainWindow = null;
let timerState = { seconds: 0, running: false };

// Separate timers for each player
let player1Timer = {
  timeMs: 0,
  running: false,
  interval: null
};

let player2Timer = {
  timeMs: 0,
  running: false,
  interval: null
};

function startPlayerTimer(playerNum) {
  const timer = playerNum === 1 ? player1Timer : player2Timer;
  
  if (timer.running) return;
  
  timer.running = true;
  const startTime = Date.now() - timer.timeMs;
  
  timer.interval = setInterval(() => {
    timer.timeMs = Date.now() - startTime;
    broadcastTimerState();
  }, 16); // ~60 FPS updates
}

function stopPlayerTimer(playerNum) {
  const timer = playerNum === 1 ? player1Timer : player2Timer;
  
  if (timer.interval) {
    clearInterval(timer.interval);
    timer.interval = null;
  }
  
  timer.running = false;
  broadcastTimerState();
}

function broadcastTimerState() {
  if (timerPopOutWindow && !timerPopOutWindow.isDestroyed()) {
    timerPopOutWindow.webContents.send('timer-update', {
      player1TimeMs: player1Timer.timeMs,
      player1Running: player1Timer.running,
      player2TimeMs: player2Timer.timeMs,
      player2Running: player2Timer.running
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile('index.html');
}

function createPopOutWindow(imagePath, mapName) {
  const popOutWindow = new BrowserWindow({
    width: 600,
    height: 600,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  popOutWindow.loadFile('popout.html', { query: { image: encodeURIComponent(imagePath), name: mapName } });
  
  const windowId = `popout-${Date.now()}`;
  popOutWindows[windowId] = popOutWindow;
  
  popOutWindow.on('closed', () => {
    delete popOutWindows[windowId];
  });

  return popOutWindow;
}

function createTimerPopOutWindow() {
  // Close existing timer pop-out if open
  if (timerPopOutWindow && !timerPopOutWindow.isDestroyed()) {
    timerPopOutWindow.focus();
    return;
  }

  timerPopOutWindow = new BrowserWindow({
    width: 600,
    height: 200,
    frame: false,
    alwaysOnTop: true,
    type: 'toolbar',
    resizable: true,
    transparent: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      backgroundThrottling: false,
      webSecurity: true,
      sandbox: true,
      preload: path.join(__dirname, 'timer-preload.js')
    }
  });

  timerPopOutWindow.loadFile('timer-popout.html');
  
  // Show window when ready
  timerPopOutWindow.once('ready-to-show', () => {
    timerPopOutWindow.show();
    // Ensure highest z-order level for gaming overlay
    timerPopOutWindow.setAlwaysOnTop(true, 'screen-saver');
  });
  
  timerPopOutWindow.on('closed', () => {
    timerPopOutWindow = null;
  });

  return timerPopOutWindow;
}

// Handle timer updates for pop-out
ipcMain.on('timer-state-request', (event) => {
  event.reply('timer-update', {
    player1TimeMs: player1Timer.timeMs,
    player1Running: player1Timer.running,
    player2TimeMs: player2Timer.timeMs,
    player2Running: player2Timer.running
  });
});

ipcMain.on('update-timer-state', (event, state) => {
  timerState = state;
  // Broadcast to pop-out window
  if (timerPopOutWindow && !timerPopOutWindow.isDestroyed()) {
    timerPopOutWindow.webContents.send('timer-update', timerState);
  }
});

// Handle timer window dragging
ipcMain.on('move-timer-window', (event, { deltaX, deltaY }) => {
  if (timerPopOutWindow && !timerPopOutWindow.isDestroyed()) {
    const [x, y] = timerPopOutWindow.getPosition();
    timerPopOutWindow.setPosition(Math.round(x + deltaX), Math.round(y + deltaY));
  }
});

// Handle individual player timer controls
ipcMain.on('start-player-timer', (event, { playerNum }) => {
  startPlayerTimer(playerNum);
  console.log(`Player ${playerNum} timer started`);
});

ipcMain.on('stop-player-timer', (event, { playerNum }) => {
  stopPlayerTimer(playerNum);
  console.log(`Player ${playerNum} timer stopped`);
});

app.on('ready', () => {
  createWindow();
  registerGlobalHotkeys();
});

// Handle loading images
ipcMain.handle('load-images', () => {
  try {
    const imagesDir = path.join(__dirname, 'images');
    console.log('📁 App directory:', __dirname);
    console.log('📁 Images directory:', imagesDir);
    
    if (!fs.existsSync(imagesDir)) {
      console.log('❌ Images directory does not exist!');
      return [];
    }
    
    const allFiles = fs.readdirSync(imagesDir);
    console.log('📄 All files in directory:', allFiles);
    
    const files = allFiles
      .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .sort();
    
    console.log('🖼️ Found image files:', files);
    
    const result = files.map(file => ({
      name: file,
      path: `file://${path.join(imagesDir, file).replace(/\\/g, '/')}`
    }));
    
    console.log('✅ Returning:', result);
    return result;
  } catch (error) {
    console.error('❌ Error loading images:', error);
    return [];
  }
});

// Handle pop out window
ipcMain.handle('popout-image', (event, imagePath, mapName) => {
  createPopOutWindow(imagePath, mapName);
});

// Handle timer pop out window
ipcMain.handle('popout-timer', () => {
  createTimerPopOutWindow();
});

// Handle window resizing
ipcMain.on('resize-popout', (event, width, height) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    window.setSize(width, height);
  }
});

// Handle timer always-on-top setting
ipcMain.on('set-timer-always-on-top', (event, alwaysOnTop) => {
  if (timerPopOutWindow && !timerPopOutWindow.isDestroyed()) {
    timerPopOutWindow.setAlwaysOnTop(alwaysOnTop);
    console.log('Timer always on top set to:', alwaysOnTop);
  }
});

// Handle timer style updates
ipcMain.on('update-timer-style', (event, style) => {
  if (timerPopOutWindow && !timerPopOutWindow.isDestroyed()) {
    timerPopOutWindow.webContents.send('timer-style-update', { style });
    console.log('Timer style updated to:', style);
  }
});

// Handle timer color updates
ipcMain.on('update-timer-color', (event, { color, colorName }) => {
  if (timerPopOutWindow && !timerPopOutWindow.isDestroyed()) {
    timerPopOutWindow.webContents.send('timer-style-update', { color });
    console.log('Timer color updated to:', color);
  }
});

// Global hotkey system deprecated - using local hotkeys for dual-timer
// IPC handler kept for backwards compatibility but not actively used
ipcMain.on('set-global-hotkeys', (event, hotkeys) => {
  // Global hotkeys no longer registered for dual-timer system
  console.log('Global hotkeys update received but not used - dual-timer uses local hotkeys');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
