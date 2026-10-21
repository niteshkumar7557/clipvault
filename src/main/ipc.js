/**
 * IPC Handlers Module - Milestone 5
 * 
 * Electron APIs used:
 * - ipcMain: Receives requests from renderer processes via `ipcMain.handle`.
 * - clipboard: Writes selected history items back to OS pasteboard.
 * - Menu: Dynamically constructs and displays native macOS context menus (`Menu.popup`).
 * - BrowserWindow: Retrieves the sender window to anchor native popup menus.
 * - webContents: Sends asynchronous push messages from the Main process to Renderer via `webContents.send`.
 */

const { ipcMain, clipboard, Menu, BrowserWindow } = require('electron');
const { getHistory, searchHistory, togglePin, deleteHistoryItem } = require('./store');
const { getPopupWindow, hidePopupWindow } = require('./windows');
const { rebuildTrayMenu } = require('./tray');

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

  // Milestone 5: history:search with argument validation
  ipcMain.handle('history:search', async (_event, query) => {
    if (typeof query !== 'string') {
      throw new Error('Invalid argument: query must be a string');
    }
    return searchHistory(query);
  });

  // Milestone 3 & 5: history:copy with argument validation
  ipcMain.handle('history:copy', async (_event, id) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid argument: id must be a non-empty string');
    }

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

  // Milestone 5: history:pin with argument validation
  ipcMain.handle('history:pin', async (_event, id) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid argument: id must be a non-empty string');
    }

    const updated = togglePin(id);
    broadcastHistoryUpdated();
    rebuildTrayMenu();
    return updated;
  });

  // Milestone 5: history:delete with argument validation
  ipcMain.handle('history:delete', async (_event, id) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid argument: id must be a non-empty string');
    }

    const success = deleteHistoryItem(id);
    broadcastHistoryUpdated();
    rebuildTrayMenu();
    return success;
  });

  // Milestone 5: Right-click context menu (Menu.popup from main)
  ipcMain.handle('history:contextMenu', async (event, id) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid argument: id must be a non-empty string');
    }

    const items = getHistory();
    const item = items.find(it => it.id === id);
    if (!item) {
      return false;
    }

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Copy',
        click: () => {
          if (watcherInstance) {
            watcherInstance.setLastText(item.content);
          }
          clipboard.writeText(item.content);
          hidePopupWindow();
        }
      },
      {
        label: item.pinned ? 'Unpin' : 'Pin',
        click: () => {
          togglePin(item.id);
          broadcastHistoryUpdated();
          rebuildTrayMenu();
        }
      },
      { type: 'separator' },
      {
        label: 'Delete',
        click: () => {
          deleteHistoryItem(item.id);
          broadcastHistoryUpdated();
          rebuildTrayMenu();
        }
      }
    ]);

    // Anchor native popup menu to sender BrowserWindow
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      contextMenu.popup({ window: win });
    }

    return true;
  });

  // Window hide (e.g. for Esc key)
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
