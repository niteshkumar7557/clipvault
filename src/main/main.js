/**
 * Main Process Entry Point - Milestone 4
 * 
 * Electron APIs used:
 * - app: Controls application lifecycle, single-instance lock, and dock visibility.
 * - BrowserWindow: (via windows.js) Manages application windows.
 * - Tray: (via tray.js) Manages menu bar icon and context menu.
 * - globalShortcut: (via shortcuts.js) Registers OS-level hotkeys.
 * - ipcMain: (via ipc.js) Handles inter-process communication.
 * - clipboard: (via clipboard-watcher.js) Monitors pasteboard changes.
 */

const { app } = require('electron');
const { createPopupWindow, togglePopupWindow, showPopupWindow } = require('./windows');
const { registerIpcHandlers, broadcastHistoryUpdated, setWatcherInstance } = require('./ipc');
const { registerShortcuts, unregisterShortcuts } = require('./shortcuts');
const { ClipboardWatcher } = require('./clipboard-watcher');
const { addHistoryItem } = require('./store');
const { createTray, rebuildTrayMenu, setTrayWatcher } = require('./tray');

let clipboardWatcher = null;

// Electron API: app.requestSingleInstanceLock()
// Single-instance lock prevents multiple instances of ClipVault from running concurrently.
// If the lock is acquired, this process is the primary instance.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Quitting.');
  app.quit();
} else {
  // app.on('second-instance'): Triggered when a user attempts to launch a second instance.
  // Instead of launching a duplicate, summon and focus the existing popup window.
  app.on('second-instance', () => {
    console.log('[Main] Second instance launched; focusing existing window.');
    showPopupWindow();
  });

  app.whenReady().then(() => {
    // 1. Register IPC channels
    registerIpcHandlers();

    // 2. Hide Dock icon on macOS (app lives exclusively in the menu bar)
    if (app.dock) {
      app.dock.hide();
    }

    // 3. Create the popup window
    createPopupWindow();

    // 4. Create the native macOS Tray icon and menu
    createTray();

    // 5. Initialize and start clipboard watcher
    clipboardWatcher = new ClipboardWatcher(500);
    setWatcherInstance(clipboardWatcher);
    setTrayWatcher(clipboardWatcher);

    clipboardWatcher.on('change', (text) => {
      console.log('[ClipVault] Captured copy:', text.length > 50 ? `${text.slice(0, 47)}...` : text);
      const added = addHistoryItem(text);
      if (added) {
        // Broadcast live update to popup renderer
        broadcastHistoryUpdated();
        // Rebuild tray menu with the latest 5 history items
        rebuildTrayMenu();
      }
    });
    clipboardWatcher.start();

    // 6. Register global shortcut (CommandOrControl+Shift+V)
    registerShortcuts(() => {
      togglePopupWindow();
    });

    app.on('activate', () => {
      showPopupWindow();
    });
  });

  // app.on('will-quit'): Clean up global hotkeys and polling intervals
  app.on('will-quit', () => {
    unregisterShortcuts();
    if (clipboardWatcher) {
      clipboardWatcher.stop();
    }
  });

  // app.on('window-all-closed'): Keep the application running in background when all windows close
  app.on('window-all-closed', () => {
    // Menu bar accessory apps on macOS do not terminate when windows close
  });
}
