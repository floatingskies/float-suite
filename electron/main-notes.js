/* =========================================================================
   Notebase: Electron main process
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
    title: 'Notebase',
    icon: path.join(__dirname, '..', 'favicons', 'notes-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'notes.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if(url.startsWith('http://') || url.startsWith('https://')){
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function buildMenu(){
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { label: 'File', submenu: [isMac ? { role: 'close' } : { role: 'quit' }] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }] },
    { label: 'Help', submenu: [{ label: 'About Notebase', click: () => { dialog.showMessageBox(mainWindow, { type: 'info', title: 'Notebase', message: 'Notebase 1.0', detail: 'Local-first Markdown knowledge base: Float Suite\n\n© 2025 Arik Closs Novais', buttons: ['OK'], icon: path.join(__dirname, '..', 'favicons', 'notes-512.png') }); } }] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const gotLock = app.requestSingleInstanceLock();
if(!gotLock){
  app.quit();
}else{
  app.on('second-instance', () => { if(mainWindow){ if(mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
  app.whenReady().then(() => { createWindow(); buildMenu(); app.on('activate', () => { if(BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
}
app.on('window-all-closed', () => { if(!isMac) app.quit(); });