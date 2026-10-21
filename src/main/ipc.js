/**
 * IPC Handlers Module - Milestone 6
 * 
 * Electron APIs used:
 * - ipcMain: Handles invoke calls from renderer processes.
 * - clipboard: Reads/writes pasteboard items.
 * - Menu / BrowserWindow: Builds and opens native context menus and windows.
 * - app: Manages login items via `app.setLoginItemSettings`.
 * - webContents: Broadcasts events to renderers.
 */

const { ipcMain, clipboard, Menu, BrowserWindow, app } = require('electron');
const {
  getHistory,
  searchHistory,
  togglePin,
  deleteHistoryItem,
  getSnippets,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  getSettings,
  setSetting
} = require('./store');
const { getPopupWindow, hidePopupWindow, openSettingsWindow, getSettingsWindow } = require('./windows');
const { rebuildTrayMenu } = require('./tray');
const { updateShortcut } = require('./shortcuts');

let watcherInstance = null;

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

  // ---------------------------------------------------------------------------
  // HISTORY IPC
  // ---------------------------------------------------------------------------
  ipcMain.handle('history:get', async () => {
    return getHistory();
  });

  ipcMain.handle('history:search', async (_event, query) => {
    if (typeof query !== 'string') {
      throw new Error('Invalid argument: query must be a string');
    }
    return searchHistory(query);
  });

  ipcMain.handle('history:copy', async (_event, id) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid argument: id must be a non-empty string');
    }

    const items = getHistory();
    const item = items.find(it => it.id === id);
    if (item && typeof item.content === 'string') {
      if (watcherInstance) {
        watcherInstance.setLastText(item.content);
      }
      clipboard.writeText(item.content);
    }
    hidePopupWindow();
    return true;
  });

  ipcMain.handle('history:pin', async (_event, id) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid argument: id must be a non-empty string');
    }

    const updated = togglePin(id);
    broadcastHistoryUpdated();
    rebuildTrayMenu();
    return updated;
  });

  ipcMain.handle('history:delete', async (_event, id) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid argument: id must be a non-empty string');
    }

    const success = deleteHistoryItem(id);
    broadcastHistoryUpdated();
    rebuildTrayMenu();
    return success;
  });

  ipcMain.handle('history:contextMenu', async (event, id) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid argument: id must be a non-empty string');
    }

    const items = getHistory();
    const item = items.find(it => it.id === id);
    if (!item) return false;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Copy',
        click: () => {
          if (watcherInstance) watcherInstance.setLastText(item.content);
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

    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      contextMenu.popup({ window: win });
    }
    return true;
  });

  // ---------------------------------------------------------------------------
  // SNIPPETS IPC (Milestone 6)
  // ---------------------------------------------------------------------------
  ipcMain.handle('snippets:get', async () => {
    return getSnippets();
  });

  ipcMain.handle('snippets:create', async (_event, data) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid snippet payload');
    }
    const snippet = createSnippet(data);
    broadcastSnippetsUpdated();
    return snippet;
  });

  ipcMain.handle('snippets:update', async (_event, id, data) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid snippet ID');
    }
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid snippet update payload');
    }
    const updated = updateSnippet(id, data);
    broadcastSnippetsUpdated();
    return updated;
  });

  ipcMain.handle('snippets:delete', async (_event, id) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid snippet ID');
    }
    const success = deleteSnippet(id);
    broadcastSnippetsUpdated();
    return success;
  });

  ipcMain.handle('snippets:copy', async (_event, id) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid snippet ID');
    }
    const snippets = getSnippets();
    const snippet = snippets.find(s => s.id === id);
    if (snippet && typeof snippet.content === 'string') {
      if (watcherInstance) {
        watcherInstance.setLastText(snippet.content);
      }
      clipboard.writeText(snippet.content);
    }
    hidePopupWindow();
    return true;
  });

  // ---------------------------------------------------------------------------
  // SETTINGS IPC (Milestone 6)
  // ---------------------------------------------------------------------------
  ipcMain.handle('settings:get', async () => {
    const settings = getSettings();
    let openAtLogin = false;
    try {
      openAtLogin = app.getLoginItemSettings().openAtLogin;
    } catch {
      openAtLogin = false;
    }
    return {
      ...settings,
      launchAtLogin: openAtLogin
    };
  });

  ipcMain.handle('settings:set', async (_event, key, value) => {
    if (!key || typeof key !== 'string') {
      throw new Error('Setting key must be a string');
    }

    // Apply live system side-effects immediately without restart
    if (key === 'shortcut') {
      if (!value || typeof value !== 'string') {
        throw new Error('Shortcut must be a non-empty string');
      }
      const success = updateShortcut(value);
      if (!success) {
        throw new Error(`Failed to register shortcut "${value}". It may be invalid or in use.`);
      }
    } else if (key === 'launchAtLogin') {
      const enable = Boolean(value);
      app.setLoginItemSettings({ openAtLogin: enable });
    } else if (key === 'historyLimit') {
      const limit = Number(value);
      if (isNaN(limit) || limit < 5) {
        throw new Error('History limit must be a valid number >= 5');
      }
      setSetting('historyLimit', limit);
      broadcastHistoryUpdated();
      rebuildTrayMenu();
      return getSettings();
    }

    const updated = setSetting(key, value);
    return updated;
  });

  ipcMain.handle('settings:open', async () => {
    openSettingsWindow();
    return true;
  });

  // Window hide
  ipcMain.handle('window:hide', async () => {
    hidePopupWindow();
    return true;
  });
}

function broadcastHistoryUpdated(historyItems) {
  const items = historyItems || getHistory();
  const popupWindow = getPopupWindow();
  if (popupWindow && !popupWindow.isDestroyed() && popupWindow.webContents) {
    popupWindow.webContents.send('history:updated', items);
  }
}

function broadcastSnippetsUpdated() {
  const snippets = getSnippets();
  const popupWindow = getPopupWindow();
  if (popupWindow && !popupWindow.isDestroyed() && popupWindow.webContents) {
    popupWindow.webContents.send('snippets:updated', snippets);
  }
}

module.exports = {
  registerIpcHandlers,
  broadcastHistoryUpdated,
  broadcastSnippetsUpdated,
  setWatcherInstance
};
