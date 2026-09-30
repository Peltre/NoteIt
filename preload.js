const { contextBridge, ipcRenderer } = require('electron')

// Mouse / events that listen / send 
contextBridge.exposeInMainWorld('api', {
    captureMouse: () => ipcRenderer.send('mouse:capture'),
    breachMouse: () => ipcRenderer.send('mouse:breach'),
    onAddNote: (callback) => ipcRenderer.on('notes:add', callback),
    onToggleNotes: (callback) => ipcRenderer.on('notes:toggle', callback),
    onToggleBar: (callback) => ipcRenderer.on('bar:toggle', callback),
    saveNotes: (notes) => ipcRenderer.send('notes:save', notes),
    loadNotes: () => ipcRenderer.invoke('notes:load'),
    moveCanvas: (dx, dy) => ipcRenderer.send('canvas:move', { dx, dy }),
    resizeCanvas: (dx, dy) => ipcRenderer.send('canvas:resize', { dx, dy }),
    saveCanvas: () => ipcRenderer.send('canvas:save'),
    fitCanvas: () => ipcRenderer.send('canvas:fit')
})