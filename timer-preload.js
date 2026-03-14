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
  }
});
