/**
 * Windows Management Module
 * 
 * Electron APIs used:
 * - BrowserWindow: Creates and controls native application windows.
 */

const { BrowserWindow } = require('electron');
const path = require('path');

let popupWindow = null;
// In Milestone 2, default stayOpen to true so the user can watch the list update
// live while copying in other apps before Milestone 3 registers the global shortcut.
let stayOpen = true;

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
  popupWindow.once('ready-to-show', () => {
    popupWindow.show();
    popupWindow.focus();
  });

  // BrowserWindow event: 'blur'
  // Section 9: hide on blur (bypassed if stayOpen is true or DevTools is open)
  popupWindow.on('blur', () => {
    if (stayOpen || popupWindow.webContents.isDevToolsOpened()) {
      return;
    }
    console.log('[ClipVault] Popup window blurred and hidden (Section 9).');
    popupWindow.hide();
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

/**
 * Sets whether the window should stay visible on blur.
 * @param {boolean} val 
 */
function setStayOpen(val) {
  stayOpen = Boolean(val);
}

/**
 * Returns whether stayOpen is active.
 * @returns {boolean}
 */
function isStayOpen() {
  return stayOpen;
}

module.exports = {
  createPopupWindow,
  getPopupWindow,
  setStayOpen,
  isStayOpen
};
