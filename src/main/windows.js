/**
 * Windows Management Module
 * 
 * Electron APIs used:
 * - BrowserWindow: Creates and controls native application windows.
 * - screen: Reads display dimensions and cursor position to place the window intelligently.
 */

const { BrowserWindow, screen } = require('electron');
const path = require('path');

let popupWindow = null;

/**
 * Calculates display bounds and positions the window directly near the user's cursor,
 * keeping it within the current display's visible work area.
 * 
 * @param {BrowserWindow} win 
 */
function positionNearCursor(win) {
  const [width, height] = win.getSize();
  // screen.getCursorScreenPoint: Returns current mouse cursor { x, y } coordinates in screen coordinates
  const cursorPoint = screen.getCursorScreenPoint();
  // screen.getDisplayNearestPoint: Finds the screen display containing the mouse cursor
  const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
  const { workArea } = currentDisplay;

  // Center horizontally relative to cursor, place slightly below cursor
  let x = Math.round(cursorPoint.x - (width / 2));
  let y = Math.round(cursorPoint.y + 12);

  // Constrain horizontally within active display work area
  if (x + width > workArea.x + workArea.width - 12) {
    x = workArea.x + workArea.width - width - 12;
  }
  if (x < workArea.x + 12) {
    x = workArea.x + 12;
  }

  // Constrain vertically within active display work area (flip above cursor if near bottom edge)
  if (y + height > workArea.y + workArea.height - 12) {
    y = Math.round(cursorPoint.y - height - 12);
  }
  if (y < workArea.y + 12) {
    y = workArea.y + 12;
  }

  win.setPosition(x, y, false);
}

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
    
    // Kept hidden until ready or triggered via shortcut/tray
    show: false,
    
    // Keep window on top of other applications like a native floating palette
    alwaysOnTop: true,
    resizable: false,
    
    // macOS accessory mode: do not create a separate taskbar/dock icon entry
    skipTaskbar: true,
    
    // macOS Vibrancy effect (frosted glass appearance per Section 9)
    vibrancy: 'under-window',
    visualEffectState: 'active',
    transparent: true,
    backgroundColor: '#00000000',
    
    // Security & Preload configuration
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,  // Isolates context between preload and renderer scripts
      nodeIntegration: false,  // Disables Node.js access in renderer
      sandbox: true            // Enforces Chromium OS-level sandboxing
    }
  });

  // Load the popup HTML UI
  popupWindow.loadFile(path.join(__dirname, '../renderer/popup/index.html'));

  // BrowserWindow event: 'blur'
  // Section 9: hide on blur (kept visible only if DevTools is open for debugging)
  popupWindow.on('blur', () => {
    if (popupWindow.webContents.isDevToolsOpened()) {
      return;
    }
    popupWindow.hide();
  });

  return popupWindow;
}

/**
 * Shows the popup window positioned near the current cursor.
 */
function showPopupWindow() {
  if (!popupWindow || popupWindow.isDestroyed()) {
    createPopupWindow();
  }

  positionNearCursor(popupWindow);
  popupWindow.show();
  popupWindow.focus();

  // Notify renderer that the window was summoned
  if (popupWindow.webContents && !popupWindow.webContents.isDestroyed()) {
    popupWindow.webContents.send('window:shown');
  }
}

/**
 * Hides the popup window.
 */
function hidePopupWindow() {
  if (popupWindow && !popupWindow.isDestroyed() && popupWindow.isVisible()) {
    popupWindow.hide();
  }
}

/**
 * Toggles visibility of the popup window.
 */
function togglePopupWindow() {
  if (!popupWindow || popupWindow.isDestroyed()) {
    createPopupWindow();
    showPopupWindow();
    return;
  }

  if (popupWindow.isVisible()) {
    hidePopupWindow();
  } else {
    showPopupWindow();
  }
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
  getPopupWindow,
  showPopupWindow,
  hidePopupWindow,
  togglePopupWindow,
  positionNearCursor
};
