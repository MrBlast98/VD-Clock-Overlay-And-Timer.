const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('timerApi', {
  onTimerUpdate: (callback) => {
    ipcRenderer.on('timer-update', (event, data) => {
      callback(data);
    });
  },
  requestTimerState: () => {
    ipcRenderer.send('timer-state-request');
  },
  onStyleUpdate: (callback) => {
    ipcRenderer.on('timer-style-update', (event, data) => {
      callback(data);
    });
  },
  moveWindow: (deltaX, deltaY) => {
    ipcRenderer.send('move-timer-window', { deltaX, deltaY });
  },
  startPlayerTimer: (playerNum) => {
    ipcRenderer.send('start-player-timer', { playerNum });
  },
  stopPlayerTimer: (playerNum) => {
    ipcRenderer.send('stop-player-timer', { playerNum });
  },
  updateTimerStyle: (style) => {
    ipcRenderer.send('update-timer-style', style);
  }
});
