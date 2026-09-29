const { app, BrowserWindow, screen, ipcMain, globalShortcut } = require('electron')
const path = require('path')
const fs = require('fs')

function loadBounds() {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json')
    try {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf-8')).bounds
    } catch {
        return null
    }
}

function createCanvas() {
    // New dynamic way to obtain canvasSize if modified from initial (screen size)
    const bounds = loadBounds() || screen.getPrimaryDisplay().workArea
    const { x, y, width, height } = bounds
    const settingsPath = path.join(app.getPath('userData'), 'settings.json')

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

    function saveBounds() {
        fs.writeFileSync(settingsPath, JSON.stringify({ bounds: canvas.getBounds() }, null, 2))
    }

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

    ipcMain.on('canvas:fit', () => {
        const display = screen.getDisplayMatching(canvas.getBounds())
        canvas.setBounds(display.workArea)
        saveBounds()
    })

    ipcMain.on('canvas:move', (event, { dx, dy }) => {
        const [x, y] = canvas.getPosition()
        canvas.setPosition(Math.round(x + dx), Math.round(y + dy))
    })

    ipcMain.on('canvas:resize', (event, { dx, dy }) => {
        const [w, h] = canvas.getSize()
        canvas.setSize(Math.round(Math.max(300, w + dx)), Math.round(Math.max(200, h + dy)))
    }) 

    ipcMain.on('canvas:save', () => {
        saveBounds()
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
