/**
 * Main Process Entry Point
 * 
 * Electron APIs used:
 * - app: Manages application lifecycle and system events.
 * - BrowserWindow: (via windows.js) Manages application windows.
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

let clipboardWatcher = null;

// Ensure single instance of the application
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    // 1. Register IPC channels
    registerIpcHandlers();

    // 2. Hide Dock icon on macOS (runs as menu bar utility)
    if (app.dock) {
      app.dock.hide();
    }

    // 3. Create the popup window
    createPopupWindow();
    // Show window initially on launch so user knows app has booted
    showPopupWindow();

    // 4. Initialize and start clipboard watcher
    clipboardWatcher = new ClipboardWatcher(500);
    setWatcherInstance(clipboardWatcher);
    clipboardWatcher.on('change', (text) => {
      console.log('[ClipVault] Captured copy:', text.length > 50 ? `${text.slice(0, 47)}...` : text);
      const added = addHistoryItem(text);
      if (added) {
        broadcastHistoryUpdated();
      }
    });
    clipboardWatcher.start();

    // 5. Register global shortcut (CommandOrControl+Shift+V)
    registerShortcuts(() => {
      togglePopupWindow();
    });

    app.on('activate', () => {
      showPopupWindow();
    });
  });

  // app.on('will-quit'): Fires right before Electron finishes quitting.
  // Crucial: Must unregister globalShortcut hooks and clean up polling timers.
  app.on('will-quit', () => {
    unregisterShortcuts();
    if (clipboardWatcher) {
      clipboardWatcher.stop();
    }
  });

  // Do not quit when windows close on macOS
  app.on('window-all-closed', () => {
    // Keep alive in background
  });
}
