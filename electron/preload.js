/* =========================================================================
   Float Suite: Electron preload
   Minimal bridge; the apps already run as vanilla JS in the browser.
   We expose a tiny `floatDesktop` API so the apps can detect they're inside
   Electron (e.g. to hide "open in browser" buttons or show desktop-only
   shortcuts).
   ========================================================================= */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('floatDesktop', {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  }
});
