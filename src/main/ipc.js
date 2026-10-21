/**
 * IPC Handlers Module
 * 
 * Electron API: ipcMain
 * ipcMain receives inter-process communication messages sent from renderer processes.
 * We use `ipcMain.handle` to implement a request-response pattern with `ipcRenderer.invoke`.
 */

const { ipcMain } = require('electron');

/**
 * Registers all IPC listeners and handlers for the application.
 */
function registerIpcHandlers() {
  // ipcMain.handle: Registers a handler for an invoke-based IPC call from the renderer.
  // It returns a promise to the renderer's ipcRenderer.invoke('app:ping').
  ipcMain.handle('app:ping', async () => {
    return 'pong from main';
  });
}

module.exports = {
  registerIpcHandlers
};
