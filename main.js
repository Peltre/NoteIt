const { app, BrowserWindow, screen, ipcMain, globalShortcut } = require('electron')
const path = require('path')
const fs = require('fs')

function createCanvas() {
    // Useful area of the screen (not counting windows taskbar)
    const { x, y, width, height } = screen.getPrimaryDisplay().workArea

    const dataPath = path.join(app.getPath('userData'), 'notes.json')

    const canvas = new BrowserWindow({
        x, y, width, height,
        frame: false,
        transparent: true,
        resizable: true,
        hasShadow: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    canvas.setAlwaysOnTop(true, 'screen-saver')
    canvas.loadFile('canvas.html')
    // Console debugging
    // canvas.webContents.openDevTools({ mode: 'detach' }) 

    // On start, mouse breaches canvas
    canvas.setIgnoreMouseEvents(true, { forward: true })

    ipcMain.on('mouse:capture', () => {
        canvas.setIgnoreMouseEvents(false)
    })

    ipcMain.on('mouse:breach', () => {
        canvas.setIgnoreMouseEvents(true, { forward: true })
    })

    ipcMain.on('notes:save', (event, notes) => {
        fs.writeFileSync(dataPath, JSON.stringify(notes, null, 2))
    })

    ipcMain.handle('notes:load', () => {
        try {
            return JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
        } catch {
            return [] // <- empty on the first execution
        }
    })

    // Shortcut to create a new note
    globalShortcut.register('CommandOrControl+Shift+C', () => {
        canvas.webContents.send('notes:add')
    })

    // Shortcut to toggle note visibiliy
    globalShortcut.register('CommandOrControl+Shift+H', () => {
        canvas.webContents.send('notes:toggle')
    })
}

app.whenReady().then(createCanvas)
app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => app.quit())