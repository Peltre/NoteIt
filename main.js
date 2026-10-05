// 1. Imports

const { app, BrowserWindow, screen, ipcMain, globalShortcut, Tray, Menu } = require('electron')
const path = require('path')
const fs = require('fs')

let tray = null

// 2. Settings helpers

function loadBounds() {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json')
    try {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf-8')).bounds
    } catch {
        return null
    }
}

// 3. Canvas window

function createCanvas() {

    // 3.1 Paths & initial bounds

    // New dynamic way to obtain canvasSize if modified from initial (screen size)
    const bounds = loadBounds() || screen.getPrimaryDisplay().workArea
    const { x, y, width, height } = bounds
    const settingsPath = path.join(app.getPath('userData'), 'settings.json')

    const dataPath = path.join(app.getPath('userData'), 'notes.json')

    // 3.2 Window creation

    const canvas = new BrowserWindow({
        x, y, width, height,
        frame: false,
        transparent: true,
        resizable: true,
        hasShadow: false,
        alwaysOnTop: true,
        skipTaskbar: true,
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

    // 3.3 IPC: mouse capture / pass-through

    // On start, mouse breaches canvas
    canvas.setIgnoreMouseEvents(true, { forward: true })

    ipcMain.on('mouse:capture', () => {
        canvas.setIgnoreMouseEvents(false)
    })

    ipcMain.on('mouse:breach', () => {
        canvas.setIgnoreMouseEvents(true, { forward: true })
    })

    // 3.4 IPC: notes persistence

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

    // 3.5 IPC: canvas move / resize / fit / save

    ipcMain.on('canvas:move', (event, { dx, dy }) => {
        const [x, y] = canvas.getPosition()
        canvas.setPosition(Math.round(x + dx), Math.round(y + dy))
    })

    ipcMain.on('canvas:resize', (event, { dx, dy }) => {
        const [w, h] = canvas.getSize()
        canvas.setSize(Math.round(Math.max(300, w + dx)), Math.round(Math.max(200, h + dy)))
    }) 

    ipcMain.on('canvas:fit', () => {
        const display = screen.getDisplayMatching(canvas.getBounds())
        canvas.setBounds(display.workArea)
        saveBounds()
    })

    ipcMain.on('canvas:save', () => {
        saveBounds()
    })

    // 3.6 Global shortcuts

    // Shortcut to create a new note
    globalShortcut.register('CommandOrControl+Shift+C', () => {
        canvas.webContents.send('notes:add')
    })

    // Shortcut to toggle note visibiliy
    globalShortcut.register('CommandOrControl+Shift+H', () => {
        canvas.webContents.send('notes:toggle')
    })

    // Shortcut to toggle masterBar visibility
    globalShortcut.register('CommandOrControl+Alt+B', () => {
        canvas.webContents.send('bar:toggle')
    })

    // 3.7 System tray
    tray = new Tray(path.join(__dirname, 'assets', 'icon.ico'))
    tray.setToolTip('NoteIt')

    tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Nueva nota', click: () => canvas.webContents.send('notes:add') },
        { label: 'Mostrar / ocultar notas', click: () => canvas.webContents.send('notes:toggle') },
        { label: 'Mostrar / ocultar barra', click: () => canvas.webContents.send('bar:toggle') },
        { type: 'separator' },
        { label: 'Salir', click: () => app.quit() } 
    ]))

    tray.on('click', () => canvas.webContents.send('bar:toggle')) // left click toggles master bar
}

// 4. App lifecycle

app.whenReady().then(createCanvas)
app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => app.quit())