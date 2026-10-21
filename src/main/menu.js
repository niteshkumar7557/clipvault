/**
 * Native Application Menu Module - Milestone 7
 * 
 * Electron APIs used:
 * - Menu: Builds the native application menu bar.
 * - MenuItem: Defines menu items and accelerators.
 * - app: Provides system roles and application metadata.
 */

const { Menu, app } = require('electron');
const { openSettingsWindow } = require('./windows');

/**
 * Constructs and sets the native macOS application menu.
 * 
 * @param {Object} [actions={}]
 * @param {Function} [actions.onExport] - Export history handler
 * @param {Function} [actions.onImport] - Import history handler
 * @param {Function} [actions.onClear] - Clear history handler
 */
function setupApplicationMenu(actions = {}) {
  const isMac = process.platform === 'darwin';

  const template = [
    // macOS Application Menu
    ...(isMac ? [{
      label: app.name || 'ClipVault',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'Cmd+,',
          click: () => openSettingsWindow()
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Export History (JSON)...',
          accelerator: 'Cmd+E',
          click: () => {
            if (typeof actions.onExport === 'function') actions.onExport();
          }
        },
        {
          label: 'Import History (JSON)...',
          accelerator: 'Cmd+I',
          click: () => {
            if (typeof actions.onImport === 'function') actions.onImport();
          }
        },
        { type: 'separator' },
        {
          label: 'Clear Unpinned History...',
          click: () => {
            if (typeof actions.onClear === 'function') actions.onClear();
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },

    // Edit Menu (Standard macOS clipboard & editing commands)
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' }
      ]
    },

    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' }
        ] : [
          { role: 'close' }
        ])
      ]
    },

    // Help Menu
    {
      role: 'help',
      submenu: [
        {
          label: 'About ClipVault',
          click: () => {
            openSettingsWindow();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  return menu;
}

module.exports = {
  setupApplicationMenu
};
