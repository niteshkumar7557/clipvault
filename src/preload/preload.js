/**
 * Preload Script
 * 
 * Electron APIs used:
 * - contextBridge: Safely bridges APIs between the isolated preload world and the renderer window.
 * - ipcRenderer: Invokes main handlers and listens for events pushed from main.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Milestone 1: IPC ping verification
  ping: () => ipcRenderer.invoke('app:ping'),

  // History APIs
  history: {
    /**
     * Retrieves all history items from the main store.
     * @returns {Promise<Array>}
     */
    get: () => ipcRenderer.invoke('history:get'),

    /**
     * Milestone 3: Writes selected item back to clipboard and hides popup.
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    copy: (id) => ipcRenderer.invoke('history:copy', id)
  },

  // Window APIs
  window: {
    /**
     * Milestone 3: Dismisses the popup window (e.g. on Esc key).
     * @returns {Promise<boolean>}
     */
    hide: () => ipcRenderer.invoke('window:hide')
  },

  /**
   * Subscribes to live history updates pushed by the main process.
   * @param {Function} callback
   * @returns {Function} Cleanup function
   */
  onHistoryUpdated: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, items) => callback(items);
    ipcRenderer.on('history:updated', handler);
    return () => ipcRenderer.removeListener('history:updated', handler);
  },

  /**
   * Subscribes to window shown events to reset UI selection.
   * @param {Function} callback
   * @returns {Function} Cleanup function
   */
  onWindowShown: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = () => callback();
    ipcRenderer.on('window:shown', handler);
    return () => ipcRenderer.removeListener('window:shown', handler);
  }
});
