const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: "BitShadow Pro - Esteganografia",
        icon: path.join(__dirname, 'src', 'icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        },
        autoHideMenuBar: true,
        backgroundColor: '#0c0f14',
        show: false
    });

    // Remove o menu da aplicação
    Menu.setApplicationMenu(null);

    // Carrega o indexPro.html da pasta src
    win.loadFile(path.join(__dirname, 'src', 'indexPro.html'));

    // Mostra a janela quando estiver pronta para evitar flash branco
    win.once('ready-to-show', () => {
        win.show();
    });

    // Para debug (descomenta se necessário):
    // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
