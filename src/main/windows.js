/**
 * Windows Management Module
 * 
 * Electron APIs used:
 * - BrowserWindow: Creates and controls native application windows.
 * - screen: Retrieves display and cursor information for precise window positioning.
 */

const { BrowserWindow } = require('electron');
const path = require('path');

let popupWindow = null;

/**
 * Creates the frameless, vibrant macOS popup window according to design.md Section 9.
 * @returns {BrowserWindow}
 */
function createPopupWindow() {
  popupWindow = new BrowserWindow({
    // Window dimensions (Section 9)
    width: 420,
    height: 480,
    
    // Frameless HUD style (no macOS title bar or traffic light buttons)
    frame: false,
    
    // Do not show immediately to prevent visual flicker before renderer finishes painting
    show: false,
    
    // Keep window on top of other applications like a native floating palette
    alwaysOnTop: true,
    resizable: false,
    
    // macOS accessory mode: do not create a separate taskbar/dock icon entry
    skipTaskbar: true,
    
    // macOS Vibrancy effect (frosted glass appearance)
    vibrancy: 'under-window',
    visualEffectState: 'active',
    transparent: true,
    backgroundColor: '#00000000',
    
    // Security & Preload configuration
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      // Security best practices:
      contextIsolation: true,  // Isolates context between preload and renderer scripts
      nodeIntegration: false,  // Disables Node.js access in renderer
      sandbox: true            // Enforces Chromium OS-level sandboxing
    }
  });

  // Center window on initial launch
  popupWindow.center();

  // Load the popup HTML UI
  popupWindow.loadFile(path.join(__dirname, '../renderer/popup/index.html'));

  // BrowserWindow event: 'ready-to-show'
  // Fires when the renderer has painted the first frame; best time to show the window without flashing
  popupWindow.once('ready-to-show', () => {
    popupWindow.show();
    popupWindow.focus();
  });

  // BrowserWindow event: 'blur'
  // Section 9: hide on blur (unless DevTools is open for debugging)
  popupWindow.on('blur', () => {
    if (!popupWindow.webContents.isDevToolsOpened()) {
      console.log('[ClipVault] Popup window blurred and hidden (Section 9). Note: Global shortcut (Milestone 3) and Tray (Milestone 4) will toggle it back.');
      popupWindow.hide();
    }
  });

  return popupWindow;
}

/**
 * Returns the active popup window instance.
 * @returns {BrowserWindow|null}
 */
function getPopupWindow() {
  return popupWindow;
}

module.exports = {
  createPopupWindow,
  getPopupWindow
};
