/* =========================================================================
   Float Suite: Electron main process
   Loads the portal (index.html) inside a desktop window.
   Each app is loaded in the same window via in-page navigation; we intercept
   link clicks so the back button works correctly.
   ========================================================================= */
const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const path = require('path');

const isDev = process.argv.includes('--dev');
const isMac = process.platform === 'darwin';

let mainWindow = null;

function createWindow(){
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#f0ede6',
    title: 'Float Suite',
    icon: path.join(__dirname, '..', 'favicons', 'float-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
    show: false,
  });

  // Load the portal
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  // Show when ready (no white flash)
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Open external links in the user's browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if(url.startsWith('http://') || url.startsWith('https://')){
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

/* ---- Application menu (native, mirrors the in-app HUD) ---- */
function buildMenu(){
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Window', accelerator: 'CmdOrCtrl+Shift+N', click: () => createWindow() },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Float Suite',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Float Suite',
              message: 'Float Suite 5.2',
              detail: 'Offline-first creative & academic suite.\n\nPaint.web · Inkling · Thesis\n\n© 2025 Arik Closs Novais',
              buttons: ['OK'],
              icon: path.join(__dirname, '..', 'favicons', 'float-512.png')
            });
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ---- Single instance lock ---- */
const gotLock = app.requestSingleInstanceLock();
if(!gotLock){
  app.quit();
}else{
  app.on('second-instance', () => {
    if(mainWindow){
      if(mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    buildMenu();

    app.on('activate', () => {
      if(BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if(!isMac) app.quit();
});
