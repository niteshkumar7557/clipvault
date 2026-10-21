/**
 * Windows Management Module - Milestone 6
 * 
 * Electron APIs used:
 * - BrowserWindow: Creates and controls native application windows (Popup & Settings).
 * - screen: Reads display dimensions and cursor position.
 */

const { BrowserWindow, screen } = require('electron');
const path = require('path');

let popupWindow = null;
let settingsWindow = null;

/**
 * Calculates display bounds and positions the window directly near the user's cursor.
 * @param {BrowserWindow} win 
 */
function positionNearCursor(win) {
  const [width, height] = win.getSize();
  const cursorPoint = screen.getCursorScreenPoint();
  const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
  const { workArea } = currentDisplay;

  let x = Math.round(cursorPoint.x - (width / 2));
  let y = Math.round(cursorPoint.y + 12);

  if (x + width > workArea.x + workArea.width - 12) {
    x = workArea.x + workArea.width - width - 12;
  }
  if (x < workArea.x + 12) {
    x = workArea.x + 12;
  }

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
    width: 420,
    height: 480,
    frame: false,
    show: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  popupWindow.loadFile(path.join(__dirname, '../renderer/popup/index.html'));

  popupWindow.on('blur', () => {
    if (popupWindow.webContents.isDevToolsOpened()) {
      return;
    }
    popupWindow.hide();
  });

  return popupWindow;
}

/**
 * Creates or focuses the Settings window (Section 9: 500x400, standard frame, single instance).
 * @returns {BrowserWindow}
 */
function openSettingsWindow() {
  // Single instance check: If settings window already exists, focus it
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return settingsWindow;
  }

  settingsWindow = new BrowserWindow({
    width: 500,
    height: 420,
    minWidth: 460,
    minHeight: 380,
    frame: true,
    resizable: true,
    maximizable: false,
    title: 'ClipVault Settings',
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  settingsWindow.loadFile(path.join(__dirname, '../renderer/settings/index.html'));

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
    settingsWindow.focus();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

function showPopupWindow() {
  if (!popupWindow || popupWindow.isDestroyed()) {
    createPopupWindow();
  }

  positionNearCursor(popupWindow);
  popupWindow.show();
  popupWindow.focus();

  if (popupWindow.webContents && !popupWindow.webContents.isDestroyed()) {
    popupWindow.webContents.send('window:shown');
  }
}

function hidePopupWindow() {
  if (popupWindow && !popupWindow.isDestroyed() && popupWindow.isVisible()) {
    popupWindow.hide();
  }
}

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

function getPopupWindow() {
  return popupWindow;
}

function getSettingsWindow() {
  return settingsWindow;
}

module.exports = {
  createPopupWindow,
  getPopupWindow,
  showPopupWindow,
  hidePopupWindow,
  togglePopupWindow,
  positionNearCursor,
  openSettingsWindow,
  getSettingsWindow
};
