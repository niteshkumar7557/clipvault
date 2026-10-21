/**
 * IPC Handlers Module
 * 
 * Electron APIs used:
 * - ipcMain: Receives requests from renderer processes via `ipcMain.handle`.
 * - clipboard: Writes selected history items back to OS pasteboard.
 * - webContents: Sends asynchronous push messages from the Main process to Renderer via `webContents.send`.
 */

const { ipcMain, clipboard } = require('electron');
const { getHistory } = require('./store');
const { getPopupWindow, hidePopupWindow } = require('./windows');

let watcherInstance = null;

/**
 * Injects the active ClipboardWatcher instance to allow syncing `lastText`.
 * @param {Object} watcher 
 */
function setWatcherInstance(watcher) {
  watcherInstance = watcher;
}

/**
 * Registers all IPC listeners and handlers for the application.
 */
function registerIpcHandlers() {
  // Milestone 1: ping
  ipcMain.handle('app:ping', async () => {
    return 'pong from main';
  });

  // Milestone 2: history:get
  ipcMain.handle('history:get', async () => {
    return getHistory();
  });

  // Milestone 3: history:copy
  // Writes selected history item back to OS clipboard and closes the popup
  ipcMain.handle('history:copy', async (_event, id) => {
    const items = getHistory();
    const item = items.find(it => it.id === id);
    if (item && typeof item.content === 'string') {
      if (watcherInstance) {
        // Prevent clipboard watcher from re-recording our own write as an external copy
        watcherInstance.setLastText(item.content);
      }
      clipboard.writeText(item.content);
    }
    hidePopupWindow();
    return true;
  });

  // Milestone 3: window:hide
  // Called by renderer on 'Esc' key press to dismiss HUD
  ipcMain.handle('window:hide', async () => {
    hidePopupWindow();
    return true;
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
    popupWindow.webContents.send('history:updated', items);
  }
}

module.exports = {
  registerIpcHandlers,
  broadcastHistoryUpdated,
  setWatcherInstance
};
