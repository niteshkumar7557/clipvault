/**
 * Tray Module - Milestone 4
 * 
 * Electron APIs used:
 * - Tray: Creates and manages the system menu bar tray icon.
 * - Menu / MenuItem: Constructs native context menus attached to the tray.
 * - nativeImage: Loads and configures macOS template images.
 * - clipboard: Writes selected clips to OS clipboard.
 */

const { Tray, Menu, nativeImage, clipboard, app } = require('electron');
const path = require('path');
const { getHistory } = require('./store');
const { showPopupWindow, hidePopupWindow, openSettingsWindow } = require('./windows');

let trayInstance = null;
let watcherInstance = null;

/**
 * Truncates and normalizes clipboard text for clean display inside a native menu item.
 * @param {string} text 
 * @param {number} [maxLength=42] 
 * @returns {string}
 */
function formatMenuLabel(text, maxLength = 42) {
  if (!text) return '';
  const singleLine = text.replace(/[\r\n\t]+/g, ' ').trim();
  if (singleLine.length <= maxLength) {
    return singleLine;
  }
  return singleLine.slice(0, maxLength - 3) + '...';
}

/**
 * Injects the active ClipboardWatcher instance to allow syncing `lastText`.
 * @param {Object} watcher 
 */
function setTrayWatcher(watcher) {
  watcherInstance = watcher;
}

/**
 * Rebuilds and attaches the Tray context menu with the latest 5 history items.
 */
function rebuildTrayMenu() {
  if (!trayInstance || trayInstance.isDestroyed()) {
    return;
  }

  const history = getHistory();
  const recentItems = history.slice(0, 5); // Last 5 items (newest first)
  const template = [];

  // Header / Title label
  template.push({
    label: 'ClipVault',
    enabled: false
  });
  template.push({ type: 'separator' });

  // Section 1: Recent 5 History Items
  if (recentItems.length === 0) {
    template.push({
      label: 'No clips yet',
      enabled: false
    });
  } else {
    recentItems.forEach((item, index) => {
      const pinPrefix = item.pinned ? '📌 ' : '';
      const label = `${index + 1}. ${pinPrefix}${formatMenuLabel(item.content)}`;

      template.push({
        label,
        click: () => {
          if (watcherInstance) {
            watcherInstance.setLastText(item.content);
          }
          clipboard.writeText(item.content);
          hidePopupWindow();
        }
      });
    });
  }

  template.push({ type: 'separator' });

  // Section 2: App Controls
  template.push({
    label: 'Open ClipVault',
    accelerator: 'Shift+Cmd+V',
    click: () => {
      showPopupWindow();
    }
  });

  template.push({
    label: 'Settings...',
    click: () => {
      openSettingsWindow();
    }
  });

  template.push({ type: 'separator' });

  // Section 3: Quit
  template.push({
    label: 'Quit ClipVault',
    accelerator: 'Cmd+Q',
    click: () => {
      app.quit();
    }
  });

  // Construct and set the native macOS menu
  const contextMenu = Menu.buildFromTemplate(template);
  trayInstance.setContextMenu(contextMenu);
}

/**
 * Initializes the macOS tray icon with a template image.
 * @returns {Tray}
 */
function createTray() {
  if (trayInstance && !trayInstance.isDestroyed()) {
    return trayInstance;
  }

  // Load the macOS template icon
  // Filename ends in 'Template.png' so macOS automatically recognizes it as a template image.
  const iconPath = path.join(__dirname, '../../assets/trayTemplate.png');
  const trayIcon = nativeImage.createFromPath(iconPath);

  // Explicitly mark as template image for dynamic macOS dark/light mode tinting
  trayIcon.setTemplateImage(true);

  trayInstance = new Tray(trayIcon);
  trayInstance.setToolTip('ClipVault Clipboard Manager');

  // Build the initial context menu
  rebuildTrayMenu();

  return trayInstance;
}

/**
 * Returns the current Tray instance.
 * @returns {Tray|null}
 */
function getTray() {
  return trayInstance;
}

module.exports = {
  createTray,
  rebuildTrayMenu,
  setTrayWatcher,
  getTray
};
