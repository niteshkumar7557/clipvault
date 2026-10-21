/**
 * IPC Handlers Module - Milestone 7
 * 
 * Electron APIs used:
 * - ipcMain: Handles invoke calls from renderer processes.
 * - clipboard: Reads/writes pasteboard items.
 * - dialog: Native file save/open dialogs and confirmation message boxes.
 * - shell: Safely opens external URLs (strictly http and https).
 * - Menu / BrowserWindow: Context menus and parent window associations.
 * - app: Login item settings.
 */

const { ipcMain, clipboard, dialog, shell, Menu, BrowserWindow, app, nativeTheme } = require('electron');
const fs = require('fs');
const {
  getHistory,
  searchHistory,
  togglePin,
  deleteHistoryItem,
  clearHistory,
  addHistoryItem,
  getSnippets,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  getSettings,
  setSetting
} = require('./store');
const { getPopupWindow, hidePopupWindow, openSettingsWindow } = require('./windows');
const { rebuildTrayMenu } = require('./tray');
const { updateShortcut } = require('./shortcuts');
const { notifyCopied, notifyPinned } = require('./notifications');

let watcherInstance = null;

function setWatcherInstance(watcher) {
  watcherInstance = watcher;
}

/**
 * Validates whether a string is a secure web URL (http or https).
 * @param {string} urlString 
 * @returns {boolean}
 */
function isValidHttpUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const parsed = new URL(urlString.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Exports history to a JSON file via dialog.showSaveDialog.
 * @param {BrowserWindow} [parentWindow]
 * @returns {Promise<Object>}
 */
async function exportHistoryDialog(parentWindow) {
  const win = parentWindow || getPopupWindow();
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export Clipboard History (JSON)',
    defaultPath: 'clipvault-history.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  const items = getHistory();
  await fs.promises.writeFile(filePath, JSON.stringify(items, null, 2), 'utf-8');
  return { success: true, count: items.length, filePath };
}

/**
 * Imports history from a JSON file via dialog.showOpenDialog.
 * @param {BrowserWindow} [parentWindow]
 * @returns {Promise<Object>}
 */
async function importHistoryDialog(parentWindow) {
  const win = parentWindow || getPopupWindow();
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Import Clipboard History (JSON)',
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { canceled: true };
  }

  const content = await fs.promises.readFile(filePaths[0], 'utf-8');
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid JSON format: expected an array of history items.');
  }

  let count = 0;
  for (const item of parsed) {
    if (item && typeof item.content === 'string' && item.content.trim() !== '') {
      const added = addHistoryItem(item.content, item.type || 'text');
      if (added && item.pinned) {
        togglePin(added.id);
      }
      count++;
    }
  }

  broadcastHistoryUpdated();
  rebuildTrayMenu();
  return { success: true, count };
}

/**
 * Shows confirmation message box via dialog.showMessageBox to clear history.
 * @param {BrowserWindow} [parentWindow]
 * @returns {Promise<Object>}
 */
async function confirmClearHistoryDialog(parentWindow) {
  const win = parentWindow || getPopupWindow();
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['Clear All Unpinned', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    title: 'Clear History',
    message: 'Clear Clipboard History?',
    detail: 'This will delete all unpinned clipboard clips. Pinned items will remain saved.'
  });

  if (response === 0) {
    clearHistory();
    broadcastHistoryUpdated();
    rebuildTrayMenu();
    return { cleared: true };
  }

  return { cleared: false };
}

/**
 * Registers all IPC listeners and handlers for the application.
 */
function registerIpcHandlers() {
  // Milestone 1: ping
  ipcMain.handle('app:ping', async () => 'pong from main');

  // ---------------------------------------------------------------------------
  // HISTORY IPC
  // ---------------------------------------------------------------------------
  ipcMain.handle('history:get', async () => getHistory());

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
      // Milestone 7: Notification on copy
      notifyCopied(item.content);
    }
    hidePopupWindow();
    return true;
  });

  ipcMain.handle('history:pin', async (_event, id) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid argument: id must be a non-empty string');
    }

    const updated = togglePin(id);
    if (updated) {
      // Milestone 7: Notification on pin/unpin
      notifyPinned(updated.content, updated.pinned);
    }
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

  // Milestone 7: history:clear with confirmation dialog
  ipcMain.handle('history:clear', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return confirmClearHistoryDialog(win);
  });

  // Context Menu with URL detection & notifications
  ipcMain.handle('history:contextMenu', async (event, id) => {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid argument: id must be a non-empty string');
    }

    const items = getHistory();
    const item = items.find(it => it.id === id);
    if (!item) return false;

    const isUrl = isValidHttpUrl(item.content);

    const menuTemplate = [
      {
        label: 'Copy',
        click: () => {
          if (watcherInstance) watcherInstance.setLastText(item.content);
          clipboard.writeText(item.content);
          notifyCopied(item.content);
          hidePopupWindow();
        }
      },
      {
        label: item.pinned ? 'Unpin' : 'Pin',
        click: () => {
          const updated = togglePin(item.id);
          if (updated) notifyPinned(updated.content, updated.pinned);
          broadcastHistoryUpdated();
          rebuildTrayMenu();
        }
      }
    ];

    // Milestone 7: Open in Browser for valid URLs
    if (isUrl) {
      menuTemplate.push({
        label: 'Open URL in Browser',
        click: () => {
          shell.openExternal(item.content.trim());
        }
      });
    }

    menuTemplate.push({ type: 'separator' });
    menuTemplate.push({
      label: 'Delete',
      click: () => {
        deleteHistoryItem(item.id);
        broadcastHistoryUpdated();
        rebuildTrayMenu();
      }
    });

    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      contextMenu.popup({ window: win });
    }
    return true;
  });

  // ---------------------------------------------------------------------------
  // SNIPPETS IPC
  // ---------------------------------------------------------------------------
  ipcMain.handle('snippets:get', async () => getSnippets());

  ipcMain.handle('snippets:create', async (_event, data) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid snippet payload');
    const snippet = createSnippet(data);
    broadcastSnippetsUpdated();
    return snippet;
  });

  ipcMain.handle('snippets:update', async (_event, id, data) => {
    if (!id || typeof id !== 'string') throw new Error('Invalid snippet ID');
    if (!data || typeof data !== 'object') throw new Error('Invalid snippet update payload');
    const updated = updateSnippet(id, data);
    broadcastSnippetsUpdated();
    return updated;
  });

  ipcMain.handle('snippets:delete', async (_event, id) => {
    if (!id || typeof id !== 'string') throw new Error('Invalid snippet ID');
    const success = deleteSnippet(id);
    broadcastSnippetsUpdated();
    return success;
  });

  ipcMain.handle('snippets:copy', async (_event, id) => {
    if (!id || typeof id !== 'string') throw new Error('Invalid snippet ID');
    const snippets = getSnippets();
    const snippet = snippets.find(s => s.id === id);
    if (snippet && typeof snippet.content === 'string') {
      if (watcherInstance) watcherInstance.setLastText(snippet.content);
      clipboard.writeText(snippet.content);
      notifyCopied(snippet.content);
    }
    hidePopupWindow();
    return true;
  });

  // ---------------------------------------------------------------------------
  // SETTINGS & DIALOGS IPC (Milestone 7)
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
    if (!key || typeof key !== 'string') throw new Error('Setting key must be a string');

    if (key === 'shortcut') {
      if (!value || typeof value !== 'string') throw new Error('Shortcut must be a non-empty string');
      const success = updateShortcut(value);
      if (!success) throw new Error(`Failed to register shortcut "${value}".`);
    } else if (key === 'launchAtLogin') {
      app.setLoginItemSettings({ openAtLogin: Boolean(value) });
    } else if (key === 'historyLimit') {
      const limit = Number(value);
      if (isNaN(limit) || limit < 5) throw new Error('History limit must be >= 5');
      setSetting('historyLimit', limit);
      broadcastHistoryUpdated();
      rebuildTrayMenu();
      return getSettings();
    }

    return setSetting(key, value);
  });

  ipcMain.handle('settings:open', async () => {
    openSettingsWindow();
    return true;
  });

  // Milestone 7: JSON Export & Import via native dialogs
  ipcMain.handle('data:export', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return exportHistoryDialog(win);
  });

  ipcMain.handle('data:import', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return importHistoryDialog(win);
  });

  // Milestone 7: Secure URL opening (strictly http and https)
  ipcMain.handle('app:openExternal', async (_event, url) => {
    if (!isValidHttpUrl(url)) {
      throw new Error(`Security Violation: Protocol not allowed. Only http: and https: URLs may be opened.`);
    }
    await shell.openExternal(url.trim());
    return true;
  });

  // Milestone 8: nativeTheme live inspection & controls
  ipcMain.handle('theme:get', async () => {
    return {
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
      themeSource: nativeTheme.themeSource
    };
  });

  ipcMain.handle('theme:set', async (_event, source) => {
    if (['system', 'light', 'dark'].includes(source)) {
      nativeTheme.themeSource = source;
    }
    return {
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
      themeSource: nativeTheme.themeSource
    };
  });

  // Privacy & Pause Recording (Section 11)
  ipcMain.handle('watcher:togglePause', async () => {
    if (watcherInstance) {
      const state = watcherInstance.togglePause();
      rebuildTrayMenu();
      return state;
    }
    return false;
  });

  ipcMain.handle('watcher:isPaused', async () => {
    return Boolean(watcherInstance && watcherInstance.isPaused);
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
  setWatcherInstance,
  exportHistoryDialog,
  importHistoryDialog,
  confirmClearHistoryDialog,
  isValidHttpUrl
};
