/**
 * Main Process Entry Point - Milestone 7
 * 
 * Electron APIs used:
 * - app: Lifecycle, single-instance lock, dock visibility.
 * - BrowserWindow: (via windows.js) Application windows.
 * - Tray: (via tray.js) Menu bar tray icon.
 * - Menu: (via menu.js) Native macOS application menu bar.
 * - globalShortcut: (via shortcuts.js) Hotkeys.
 * - ipcMain / dialog / shell: (via ipc.js) IPC, file dialogs, secure URL launcher.
 * - clipboard: (via clipboard-watcher.js) Pasteboard monitor.
 * - Notification: (via notifications.js) System alerts.
 */

const { app } = require('electron');
const { createPopupWindow, togglePopupWindow, showPopupWindow } = require('./windows');
const {
  registerIpcHandlers,
  broadcastHistoryUpdated,
  setWatcherInstance,
  exportHistoryDialog,
  importHistoryDialog,
  confirmClearHistoryDialog
} = require('./ipc');
const { registerShortcuts, unregisterShortcuts } = require('./shortcuts');
const { ClipboardWatcher } = require('./clipboard-watcher');
const { addHistoryItem } = require('./store');
const { createTray, rebuildTrayMenu, setTrayWatcher } = require('./tray');
const { setupApplicationMenu } = require('./menu');
const { notifyCopied } = require('./notifications');

let clipboardWatcher = null;

// Ensure single instance of ClipVault
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    console.log('[Main] Second instance launched; focusing existing window.');
    showPopupWindow();
  });

  app.whenReady().then(() => {
    // 1. Register IPC handlers
    registerIpcHandlers();

    // 2. Hide Dock icon on macOS (menu bar utility mode)
    if (app.dock) {
      app.dock.hide();
    }

    // 3. Setup standard native macOS Application Menu (Milestone 7)
    setupApplicationMenu({
      onExport: () => exportHistoryDialog(),
      onImport: () => importHistoryDialog(),
      onClear: () => confirmClearHistoryDialog()
    });

    // 4. Create the popup window
    createPopupWindow();

    // 5. Create the native macOS Tray icon
    createTray();

    // 6. Initialize and start clipboard watcher
    clipboardWatcher = new ClipboardWatcher(500);
    setWatcherInstance(clipboardWatcher);
    setTrayWatcher(clipboardWatcher);

    clipboardWatcher.on('change', (text) => {
      console.log('[ClipVault] Captured copy:', text.length > 50 ? `${text.slice(0, 47)}...` : text);
      const added = addHistoryItem(text);
      if (added) {
        broadcastHistoryUpdated();
        rebuildTrayMenu();
        // Milestone 7: Native notification on copy
        notifyCopied(text);
      }
    });
    clipboardWatcher.start();

    // 7. Register global shortcut (CommandOrControl+Shift+V)
    registerShortcuts(() => {
      togglePopupWindow();
    });

    app.on('activate', () => {
      showPopupWindow();
    });
  });

  app.on('will-quit', () => {
    unregisterShortcuts();
    if (clipboardWatcher) {
      clipboardWatcher.stop();
    }
  });

  app.on('window-all-closed', () => {
    // Keep alive in menu bar
  });
}
