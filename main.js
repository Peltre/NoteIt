const { app, BrowserWindow } = require('electron')

function crearVentana() {
    const ventana = new BrowserWindow({ width: 300, height: 300 })
    ventana.loadFile('index.html')
}

app.whenReady().then(crearVentana)
app.on('window-all-closed', () => app.quit())