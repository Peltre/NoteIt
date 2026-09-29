const { contextBridge, ipcRenderer } = require('electron')

// Mouse / events that listen / send 
contextBridge.exposeInMainWorld('api', {
    captureMouse: () => ipcRenderer.send('mouse:capture'),
    breachMouse: () => ipcRenderer.send('mouse:breach'),
    onAddNote: (callback) => ipcRenderer.on('notes:add', callback),
    onToggleNotes: (callback) => ipcRenderer.on('notes:toggle', callback),
    saveNotes: (notes) => ipcRenderer.send('notes:save', notes),
    loadNotes: () => ipcRenderer.invoke('notes:load')
})