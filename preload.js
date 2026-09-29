const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    captureMouse: () => ipcRenderer.send('mouse:capture'),
    breachMouse: () => ipcRenderer.send('mouse:breach')
})