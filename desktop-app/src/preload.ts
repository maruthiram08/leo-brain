import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('leo', {
    capture: () => ipcRenderer.send('leo:capture'),
    recall: () => ipcRenderer.send('leo:recall'),
    logout: () => ipcRenderer.send('leo:logout'),
    login: () => ipcRenderer.send('leo:login'),
    hide: () => ipcRenderer.send('leo:hide'),
    onConnectionStatus: (callback: (connected: boolean) => void) => {
        ipcRenderer.on('leo:connection-status', (_event, connected) => callback(connected));
    }
});
