const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: "BitShadow Pro",
        // Como está tudo na mesma pasta, é só por o nome do ficheiro
        icon: path.join(__dirname, 'icon.png'), 
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false // Importante para evitar o erro que tiveste
        },
        autoHideMenuBar: true
    });

    // Carrega o indexPro.html que está AO LADO deste ficheiro
    win.loadFile('indexPro.html');
    
    // Se quiseres ver erros, descomenta esta linha:
    // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
