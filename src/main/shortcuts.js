/**
 * Global Shortcuts Module - Milestone 6
 * 
 * Electron API: globalShortcut
 * Registers and dynamically updates system-wide hotkeys.
 */

const { globalShortcut } = require('electron');

let currentShortcut = 'CommandOrControl+Shift+V';
let currentToggleCallback = null;

/**
 * Registers the global shortcut to toggle the popup window.
 * 
 * @param {Function} onToggle - Callback executed when the shortcut is pressed
 * @param {string} [shortcut='CommandOrControl+Shift+V'] - Keyboard accelerator string
 * @returns {boolean} Whether registration was successful
 */
function registerShortcuts(onToggle, shortcut) {
  if (typeof onToggle === 'function') {
    currentToggleCallback = onToggle;
  }
  if (shortcut && typeof shortcut === 'string') {
    currentShortcut = shortcut;
  }

  // Unregister existing shortcut before registering a new one
  if (globalShortcut.isRegistered(currentShortcut)) {
    globalShortcut.unregister(currentShortcut);
  }

  const success = globalShortcut.register(currentShortcut, () => {
    console.log(`[Shortcuts] Global shortcut triggered: ${currentShortcut}`);
    if (typeof currentToggleCallback === 'function') {
      currentToggleCallback();
    }
  });

  if (!success) {
    console.error(`[Shortcuts] Failed to register global shortcut: ${currentShortcut}`);
  } else {
    console.log(`[Shortcuts] Successfully registered global shortcut: ${currentShortcut}`);
  }

  return success;
}

/**
 * Updates the global shortcut live without restarting the application.
 * 
 * @param {string} newShortcut 
 * @returns {boolean}
 */
function updateShortcut(newShortcut) {
  if (!newShortcut || typeof newShortcut !== 'string') {
    return false;
  }

  // Unregister old
  if (globalShortcut.isRegistered(currentShortcut)) {
    globalShortcut.unregister(currentShortcut);
  }

  currentShortcut = newShortcut;
  const success = globalShortcut.register(currentShortcut, () => {
    if (typeof currentToggleCallback === 'function') {
      currentToggleCallback();
    }
  });

  return success;
}

/**
 * Returns currently registered shortcut string.
 * @returns {string}
 */
function getCurrentShortcut() {
  return currentShortcut;
}

/**
 * Unregisters all global shortcuts when application is quitting.
 */
function unregisterShortcuts() {
  globalShortcut.unregisterAll();
  console.log('[Shortcuts] Unregistered all global shortcuts.');
}

module.exports = {
  registerShortcuts,
  updateShortcut,
  getCurrentShortcut,
  unregisterShortcuts
};
