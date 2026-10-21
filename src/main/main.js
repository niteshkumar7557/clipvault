/**
 * Main Process Entry Point
 * 
 * Electron APIs used:
 * - app: Manages the application lifecycle, system events, and application-level settings.
 * - BrowserWindow: (via windows.js) Manages application windows.
 * - ipcMain: (via ipc.js) Handles inter-process communication.
 */

const { app } = require('electron');
const { createPopupWindow } = require('./windows');
const { registerIpcHandlers } = require('./ipc');

// app.requestSingleInstanceLock: Ensures only one instance of ClipVault runs at a time.
// If a second instance is launched, this returns false and the new instance quits immediately.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // app.whenReady: Returns a Promise that resolves when Electron has initialized and is ready to create browser windows.
  app.whenReady().then(() => {
    // Register IPC channels before creating windows so handlers are guaranteed ready
    registerIpcHandlers();

    // Section 10: Hide the macOS Dock icon so the utility app lives purely as a menu bar helper
    if (app.dock) {
      app.dock.hide();
    }

    // Create and display the popup window for Milestone 1
    createPopupWindow();

    // app.on('activate'): On macOS, applications are usually re-activated when clicked in the dock or triggered externally.
    app.on('activate', () => {
      // Re-create window if necessary
    });
  });

  // app.on('window-all-closed'): Section 10: Do not quit when windows close on macOS.
  // Menu bar and background clipboard manager tools should stay alive.
  app.on('window-all-closed', () => {
    // Keep app running on macOS
  });
}
