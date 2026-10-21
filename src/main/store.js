/**
 * Storage Module
 * 
 * Manages persistent storage for clipboard history and application settings
 * using `electron-store`.
 * 
 * Data Model (design.md Section 6):
 * - History Item: { id, type, content, createdAt, pinned, sourceApp }
 * - Settings: { historyLimit, shortcut, launchAtLogin, showNotifications, ignoredApps }
 */

const Store = require('electron-store');
const crypto = require('crypto');

// Initialize electron-store with default values
const store = new Store({
  name: 'clipvault-data',
  defaults: {
    history: [],
    snippets: [],
    settings: {
      historyLimit: 200,
      shortcut: 'CommandOrControl+Shift+V',
      launchAtLogin: false,
      showNotifications: true,
      ignoredApps: []
    }
  }
});

/**
 * Prunes the history list so that total items do not exceed historyLimit,
 * while ensuring that pinned items are NEVER evicted.
 * 
 * @param {Array} items - List of history items (newest first)
 * @param {number} limit - Maximum number of items
 * @returns {Array} Pruned items list
 */
function pruneHistory(items, limit) {
  if (items.length <= limit) {
    return items;
  }

  const excessCount = items.length - limit;
  const unpinnedIndicesToRemove = new Set();

  // Walk backwards from oldest to newest to find unpinned items to evict
  for (let i = items.length - 1; i >= 0 && unpinnedIndicesToRemove.size < excessCount; i--) {
    if (!items[i].pinned) {
      unpinnedIndicesToRemove.add(i);
    }
  }

  return items.filter((_, index) => !unpinnedIndicesToRemove.has(index));
}

/**
 * Returns all history items (newest first).
 * @returns {Array}
 */
function getHistory() {
  return store.get('history', []);
}

/**
 * Adds a new item to history.
 * - Places the new item at the top (newest first).
 * - Deduplicates: If the exact text already exists elsewhere in history,
 *   it preserves its pinned status, removes the old occurrence, and moves it to the top.
 * - Caps by historyLimit without ever evicting pinned items.
 * 
 * @param {string} content - The copied text content
 * @param {string} [type='text'] - 'text' or 'image'
 * @returns {Object} The added history item
 */
function addHistoryItem(content, type = 'text') {
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return null;
  }

  const history = store.get('history', []);
  const settings = store.get('settings');
  const limit = (settings && settings.historyLimit) ? settings.historyLimit : 200;

  // Check if identical content exists in history
  const existingIndex = history.findIndex(item => item.content === content && item.type === type);
  let isPinned = false;

  if (existingIndex !== -1) {
    // Preserve pinned state if it was already pinned
    isPinned = history[existingIndex].pinned;
    // Remove previous instance so it can be moved to the top
    history.splice(existingIndex, 1);
  }

  const newItem = {
    id: crypto.randomUUID(),
    type,
    content,
    createdAt: Date.now(),
    pinned: isPinned,
    sourceApp: null
  };

  // Insert newest item at the top
  history.unshift(newItem);

  // Prune history respecting historyLimit and never evicting pinned items
  const pruned = pruneHistory(history, limit);

  // Persist to disk via electron-store
  store.set('history', pruned);

  return newItem;
}

/**
 * Returns the current application settings.
 * @returns {Object}
 */
function getSettings() {
  return store.get('settings');
}

/**
 * Updates a setting value.
 * @param {string} key 
 * @param {*} value 
 */
function setSetting(key, value) {
  store.set(`settings.${key}`, value);
}

/**
 * Clears all unpinned history items.
 */
function clearHistory() {
  const history = store.get('history', []);
  const pinnedOnly = history.filter(item => item.pinned);
  store.set('history', pinnedOnly);
  return pinnedOnly;
}

module.exports = {
  store,
  getHistory,
  addHistoryItem,
  getSettings,
  setSetting,
  clearHistory,
  pruneHistory
};
