/**
 * Preload Script
 * 
 * Electron APIs used:
 * - contextBridge: Safely bridges APIs between the privileged Node.js environment
 *   of the preload script and the unprivileged renderer context (window object).
 *   This prevents prototype pollution and privilege escalation.
 * - ipcRenderer: Sends messages from the renderer process to the main process.
 *   We only call invoke() inside wrapped functions, never exposing ipcRenderer directly.
 */

const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld attaches safe properties to the renderer's `window` object.
// Here we expose `window.api` containing our typed API methods.
contextBridge.exposeInMainWorld('api', {
  /**
   * Sends a ping request to the main process and returns the response.
   * @returns {Promise<string>} 'pong from main'
   */
  ping: () => ipcRenderer.invoke('app:ping')
});
