/**
 * Storage Module - Milestone 5
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
 * Sorts items so that pinned items are placed at the top,
 * and within each group (pinned and unpinned), items are ordered newest first.
 * 
 * @param {Array} items
 * @returns {Array}
 */
function sortHistory(items) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

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
 * Returns all history items with pinned items sorted first, then newest first.
 * @returns {Array}
 */
function getHistory() {
  const items = store.get('history', []);
  return sortHistory(items);
}

/**
 * Searches history items matching the query substring (case-insensitive).
 * Pinned items appear first in search results.
 * 
 * @param {string} query 
 * @returns {Array}
 */
function searchHistory(query) {
  const items = store.get('history', []);
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return sortHistory(items);
  }

  const q = query.trim().toLowerCase();
  const matched = items.filter(item => {
    return typeof item.content === 'string' && item.content.toLowerCase().includes(q);
  });

  return sortHistory(matched);
}

/**
 * Adds a new item to history.
 * - Places the new item at the top.
 * - Deduplicates: If the exact text already exists elsewhere in history,
 *   preserves its pinned status and moves it to the top.
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
 * Toggles the pinned status of a history item by ID.
 * 
 * @param {string} id 
 * @returns {Object|null} The updated item, or null if not found
 */
function togglePin(id) {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid argument: id must be a non-empty string');
  }

  const history = store.get('history', []);
  const item = history.find(it => it.id === id);
  if (!item) {
    return null;
  }

  item.pinned = !item.pinned;
  store.set('history', history);
  return item;
}

/**
 * Deletes a history item by ID.
 * 
 * @param {string} id 
 * @returns {boolean} True if an item was removed, false otherwise
 */
function deleteHistoryItem(id) {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid argument: id must be a non-empty string');
  }

  const history = store.get('history', []);
  const initialLength = history.length;
  const filtered = history.filter(it => it.id !== id);

  if (filtered.length !== initialLength) {
    store.set('history', filtered);
    return true;
  }

  return false;
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
  searchHistory,
  addHistoryItem,
  togglePin,
  deleteHistoryItem,
  getSettings,
  setSetting,
  clearHistory,
  pruneHistory,
  sortHistory
};
