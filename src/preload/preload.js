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

  // Milestone 2: History APIs
  history: {
    /**
     * Retrieves all history items from the main store.
     * @returns {Promise<Array>}
     */
    get: () => ipcRenderer.invoke('history:get')
  },

  /**
   * Subscribes to live history updates pushed by the main process.
   * Returns an unsubscribe function to prevent memory leaks.
   * 
   * @param {Function} callback - Called with updated history array
   * @returns {Function} Cleanup function to remove the listener
   */
  onHistoryUpdated: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const handler = (_event, items) => callback(items);
    ipcRenderer.on('history:updated', handler);

    return () => {
      ipcRenderer.removeListener('history:updated', handler);
    };
  },

  // Window stayOpen controls for blur behavior testing
  window: {
    getStayOpen: () => ipcRenderer.invoke('window:getStayOpen'),
    setStayOpen: (val) => ipcRenderer.invoke('window:setStayOpen', val)
  }
});
