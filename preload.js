const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadImages: () => ipcRenderer.invoke('load-images'),
  popoutImage: (imagePath, mapName) => ipcRenderer.invoke('popout-image', imagePath, mapName),
  popoutTimer: () => ipcRenderer.invoke('popout-timer'),
  updateTimerState: (state) => ipcRenderer.send('update-timer-state', state),
  resizeWindow: (width, height) => ipcRenderer.send('resize-popout', width, height),
  onGlobalHotkey: (callback) => {
    ipcRenderer.on('global-hotkey', (event, action) => {
      callback(action);
    });
  },
  setGlobalHotkeys: (hotkeys) => ipcRenderer.send('set-global-hotkeys', hotkeys),
  setTimerAlwaysOnTop: (alwaysOnTop) => ipcRenderer.send('set-timer-always-on-top', alwaysOnTop),
  updateTimerStyle: (style) => ipcRenderer.send('update-timer-style', style),
  updateTimerColor: (color, colorName) => ipcRenderer.send('update-timer-color', { color, colorName })
});
