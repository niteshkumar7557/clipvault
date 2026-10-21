/**
 * Global Shortcuts Module
 * 
 * Electron API: globalShortcut
 * The globalShortcut module registers and unregisters system-wide keyboard shortcuts
 * with the operating system so that the application can capture keystrokes even when
 * it does NOT have focus.
 */

const { globalShortcut } = require('electron');

let currentShortcut = 'CommandOrControl+Shift+V';

/**
 * Registers the global shortcut to toggle the popup window.
 * 
 * @param {Function} onToggle - Callback executed when the shortcut is pressed
 * @param {string} [shortcut='CommandOrControl+Shift+V'] - Keyboard accelerator string
 * @returns {boolean} Whether registration was successful
 */
function registerShortcuts(onToggle, shortcut = 'CommandOrControl+Shift+V') {
  currentShortcut = shortcut;

  // Unregister existing shortcut before registering a new one
  if (globalShortcut.isRegistered(currentShortcut)) {
    globalShortcut.unregister(currentShortcut);
  }

  // globalShortcut.register: Registers an OS-level keyboard hook
  const success = globalShortcut.register(currentShortcut, () => {
    console.log(`[Shortcuts] Global shortcut pressed: ${currentShortcut}`);
    if (typeof onToggle === 'function') {
      onToggle();
    }
  });

  if (!success) {
    console.error(`[Shortcuts] Failed to register global shortcut: ${currentShortcut}. It may be reserved by the OS or another app.`);
  } else {
    console.log(`[Shortcuts] Successfully registered global shortcut: ${currentShortcut}`);
  }

  return success;
}

/**
 * Unregisters all global shortcuts when the application is quitting.
 * Must be called in app 'will-quit' lifecycle to release system hotkeys.
 */
function unregisterShortcuts() {
  globalShortcut.unregisterAll();
  console.log('[Shortcuts] Unregistered all global shortcuts.');
}

module.exports = {
  registerShortcuts,
  unregisterShortcuts
};
