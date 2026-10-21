/**
 * Main Process Entry Point
 * 
 * Electron APIs used:
 * - app: Manages application lifecycle and system events.
 * - BrowserWindow: (via windows.js) Manages application windows.
 * - ipcMain: (via ipc.js) Handles inter-process communication.
 * - clipboard: (via clipboard-watcher.js) Monitors pasteboard changes.
 */

const { app } = require('electron');
const { createPopupWindow } = require('./windows');
const { registerIpcHandlers, broadcastHistoryUpdated } = require('./ipc');
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

    // 2. Hide Dock icon on macOS (menu bar utility mode)
    if (app.dock) {
      app.dock.hide();
    }

    // 3. Create the popup window
    createPopupWindow();

    // 4. Initialize and start clipboard watcher
    // Polls clipboard every 500ms, deduplicates, and emits 'change' on new copied text
    clipboardWatcher = new ClipboardWatcher(500);
    clipboardWatcher.on('change', (text) => {
      console.log('[ClipVault] Captured clipboard copy:', text.length > 50 ? `${text.slice(0, 47)}...` : text);
      const added = addHistoryItem(text);
      if (added) {
        // Push live update to the renderer
        broadcastHistoryUpdated();
      }
    });
    clipboardWatcher.start();

    app.on('activate', () => {
      // Re-focus or handle activate event
    });
  });

  // Clean up timers on quit
  app.on('will-quit', () => {
    if (clipboardWatcher) {
      clipboardWatcher.stop();
    }
  });

  // Do not quit when windows close on macOS
  app.on('window-all-closed', () => {
    // Keep alive on macOS
  });
}
