/**
 * IPC Handlers Module
 * 
 * Electron APIs used:
 * - ipcMain: Receives requests from renderer processes via `ipcMain.handle`.
 * - webContents: Sends asynchronous push messages from the Main process to Renderer via `webContents.send`.
 */

const { ipcMain } = require('electron');
const { getHistory } = require('./store');
const { getPopupWindow, setStayOpen, isStayOpen } = require('./windows');

/**
 * Registers all IPC listeners and handlers for the application.
 */
function registerIpcHandlers() {
  // Milestone 1 ping verification
  ipcMain.handle('app:ping', async () => {
    return 'pong from main';
  });

  // Milestone 2: history:get
  // Returns the list of all clipboard history items from persistent storage
  ipcMain.handle('history:get', async () => {
    return getHistory();
  });

  // Helper IPC: toggle stayOpen state for blur handling
  ipcMain.handle('window:getStayOpen', async () => {
    return isStayOpen();
  });

  ipcMain.handle('window:setStayOpen', async (_event, val) => {
    setStayOpen(val);
    return isStayOpen();
  });
}

/**
 * Sends the updated history list to the popup renderer window.
 * Uses webContents.send('history:updated', historyItems).
 * 
 * @param {Array} [historyItems] - Optional updated history list; if omitted, loads from store
 */
function broadcastHistoryUpdated(historyItems) {
  const items = historyItems || getHistory();
  const popupWindow = getPopupWindow();

  if (popupWindow && !popupWindow.isDestroyed() && popupWindow.webContents) {
    // webContents.send pushes an event from the main process to the renderer process
    popupWindow.webContents.send('history:updated', items);
  }
}

module.exports = {
  registerIpcHandlers,
  broadcastHistoryUpdated
};
