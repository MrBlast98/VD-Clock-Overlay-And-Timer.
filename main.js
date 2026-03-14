const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let popOutWindows = {};
let timerPopOutWindow = null;
let mainWindow = null;
let timerState = { seconds: 0, running: false };
let currentHotkeys = { startStop: ' ', reset: 'r' };

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
  event.reply('timer-update', timerState);
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

// Handle hotkey updates
ipcMain.on('set-global-hotkeys', (event, hotkeys) => {
  // Unregister old shortcuts
  globalShortcut.unregisterAll();
  
  // Store new hotkeys
  currentHotkeys = hotkeys;
  
  // Register new shortcuts
  registerGlobalHotkeys();
});

function registerGlobalHotkeys() {
  try {
    // Unregister all previous shortcuts
    globalShortcut.unregisterAll();
    
    // Convert hotkey strings to Electron accelerator format
    const convertKey = (key) => {
      if (key === ' ') return 'Space';
      if (key.length === 1) return key.toUpperCase();
      return key;
    };
    
    const startStopKey = convertKey(currentHotkeys.startStop);
    const resetKey = convertKey(currentHotkeys.reset);
    
    // Register start/stop hotkey
    const startStopSuccess = globalShortcut.register(startStopKey, () => {
      console.log('Global hotkey: Start/Stop triggered');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-hotkey', 'startStop');
      }
    });
    console.log(`Registered Start/Stop hotkey (${startStopKey}):`, startStopSuccess);
    
    // Register reset hotkey
    const resetSuccess = globalShortcut.register(resetKey, () => {
      console.log('Global hotkey: Reset triggered');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-hotkey', 'reset');
      }
    });
    console.log(`Registered Reset hotkey (${resetKey}):`, resetSuccess);
  } catch (err) {
    console.error('Failed to register global hotkeys:', err);
  }
}

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
