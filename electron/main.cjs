const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const APP_URL = 'https://aadeshh.lovable.app/';
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: !app.isPackaged,
    },
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(
      '[data-lovable-badge],a[href*="lovable.dev"],#lovable-badge{display:none!important}'
    );
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// Native silent receipt printing: no dialog, no margins, no headers/footers.
ipcMain.handle('aadesh:print-receipt', async (event, opts) => {
  const widthMm = opts && opts.widthMm ? opts.widthMm : 80;
  const contents = event.sender;
  const printers = await contents.getPrintersAsync();
  const def = printers.find((p) => p.isDefault);
  return new Promise((resolve) => {
    contents.print(
      {
        silent: true,
        printBackground: true,
        deviceName: def ? def.name : undefined,
        margins: { marginType: 'none' },
        pageSize: { width: widthMm * 1000, height: 297000 }, // microns
        scaleFactor: 100,
        header: undefined,
        footer: undefined,
      },
      (success, failureReason) => resolve({ ok: success, error: failureReason })
    );
  });
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
