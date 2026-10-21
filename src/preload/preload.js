/**
 * Preload Script - Milestone 7
 * 
 * Electron APIs used:
 * - contextBridge: Safely bridges APIs between preload and renderer worlds.
 * - ipcRenderer: Invokes main handlers and subscribes to events.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Milestone 1: IPC ping verification
  ping: () => ipcRenderer.invoke('app:ping'),

  // History APIs (Milestones 2, 3, 5, 7)
  history: {
    get: () => ipcRenderer.invoke('history:get'),
    search: (query) => ipcRenderer.invoke('history:search', query),
    copy: (id) => ipcRenderer.invoke('history:copy', id),
    pin: (id) => ipcRenderer.invoke('history:pin', id),
    delete: (id) => ipcRenderer.invoke('history:delete', id),
    clear: () => ipcRenderer.invoke('history:clear'),
    contextMenu: (id) => ipcRenderer.invoke('history:contextMenu', id)
  },

  // Snippets APIs (Milestone 6)
  snippets: {
    get: () => ipcRenderer.invoke('snippets:get'),
    create: (data) => ipcRenderer.invoke('snippets:create', data),
    update: (id, data) => ipcRenderer.invoke('snippets:update', id, data),
    delete: (id) => ipcRenderer.invoke('snippets:delete', id),
    copy: (id) => ipcRenderer.invoke('snippets:copy', id)
  },

  // Settings APIs (Milestone 6)
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    open: () => ipcRenderer.invoke('settings:open')
  },

  // Data Import / Export (Milestone 7)
  data: {
    export: () => ipcRenderer.invoke('data:export'),
    import: () => ipcRenderer.invoke('data:import')
  },

  // App & Shell APIs (Milestone 7)
  app: {
    openExternal: (url) => ipcRenderer.invoke('app:openExternal', url)
  },

  // Theme APIs (Milestone 8)
  theme: {
    get: () => ipcRenderer.invoke('theme:get'),
    set: (source) => ipcRenderer.invoke('theme:set', source)
  },

  // Privacy & Watcher APIs (Section 11)
  watcher: {
    togglePause: () => ipcRenderer.invoke('watcher:togglePause'),
    isPaused: () => ipcRenderer.invoke('watcher:isPaused')
  },

  // Window APIs
  window: {
    hide: () => ipcRenderer.invoke('window:hide')
  },

  // Subscriptions
  onHistoryUpdated: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, items) => callback(items);
    ipcRenderer.on('history:updated', handler);
    return () => ipcRenderer.removeListener('history:updated', handler);
  },

  onSnippetsUpdated: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, items) => callback(items);
    ipcRenderer.on('snippets:updated', handler);
    return () => ipcRenderer.removeListener('snippets:updated', handler);
  },

  onWindowShown: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = () => callback();
    ipcRenderer.on('window:shown', handler);
    return () => ipcRenderer.removeListener('window:shown', handler);
  }
});
