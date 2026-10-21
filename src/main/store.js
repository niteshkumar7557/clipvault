/**
 * Storage Module - Milestone 6
 * 
 * Manages persistent storage for:
 * - History Items: { id, type, content, createdAt, pinned, sourceApp }
 * - Snippets: { id, title, content, tags, createdAt }
 * - Settings: { historyLimit, shortcut, launchAtLogin, showNotifications, ignoredApps }
 */

const Store = require('electron-store');
const crypto = require('crypto');

// Initialize electron-store with default values
const store = new Store({
  name: 'clipvault-data',
  defaults: {
    history: [],
    snippets: [
      {
        id: 'default-snippet-1',
        title: 'Email Sign-off',
        content: 'Best regards,\nClipVault User',
        tags: ['email', 'work'],
        createdAt: Date.now()
      }
    ],
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

  for (let i = items.length - 1; i >= 0 && unpinnedIndicesToRemove.size < excessCount; i--) {
    if (!items[i].pinned) {
      unpinnedIndicesToRemove.add(i);
    }
  }

  return items.filter((_, index) => !unpinnedIndicesToRemove.has(index));
}

/**
 * Returns all history items with pinned items sorted first.
 * @returns {Array}
 */
function getHistory() {
  const items = store.get('history', []);
  return sortHistory(items);
}

/**
 * Searches history items matching the query substring (case-insensitive).
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
 * @param {string} content 
 * @param {string} [type='text'] 
 * @returns {Object}
 */
function addHistoryItem(content, type = 'text') {
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return null;
  }

  const history = store.get('history', []);
  const settings = store.get('settings') || {};
  const limit = settings.historyLimit || 200;

  const existingIndex = history.findIndex(item => item.content === content && item.type === type);
  let isPinned = false;

  if (existingIndex !== -1) {
    isPinned = history[existingIndex].pinned;
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

  history.unshift(newItem);
  const pruned = pruneHistory(history, limit);
  store.set('history', pruned);

  return newItem;
}

/**
 * Toggles the pinned status of a history item by ID.
 * @param {string} id 
 * @returns {Object|null}
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
 * @param {string} id 
 * @returns {boolean}
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
 * Clears all unpinned history items.
 */
function clearHistory() {
  const history = store.get('history', []);
  const pinnedOnly = history.filter(item => item.pinned);
  store.set('history', pinnedOnly);
  return pinnedOnly;
}

// -----------------------------------------------------------------------------
// SNIPPETS CRUD (Milestone 6)
// -----------------------------------------------------------------------------

/**
 * Normalizes tags input into a clean array of strings.
 * @param {Array|string} tags 
 * @returns {Array<string>}
 */
function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map(t => String(t).trim()).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Returns all snippets.
 * @returns {Array}
 */
function getSnippets() {
  return store.get('snippets', []);
}

/**
 * Creates a new snippet.
 * @param {Object} data 
 * @param {string} data.title 
 * @param {string} data.content 
 * @param {Array<string>|string} [data.tags] 
 * @returns {Object} Created snippet
 */
function createSnippet({ title, content, tags = [] }) {
  if (!title || typeof title !== 'string' || title.trim() === '') {
    throw new Error('Snippet title is required');
  }
  if (!content || typeof content !== 'string' || content.trim() === '') {
    throw new Error('Snippet content is required');
  }

  const snippets = store.get('snippets', []);
  const newSnippet = {
    id: crypto.randomUUID(),
    title: title.trim(),
    content,
    tags: normalizeTags(tags),
    createdAt: Date.now()
  };

  snippets.unshift(newSnippet);
  store.set('snippets', snippets);
  return newSnippet;
}

/**
 * Updates an existing snippet by ID.
 * @param {string} id 
 * @param {Object} updates 
 * @returns {Object} Updated snippet
 */
function updateSnippet(id, updates) {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid snippet ID');
  }

  const snippets = store.get('snippets', []);
  const index = snippets.findIndex(s => s.id === id);
  if (index === -1) {
    throw new Error('Snippet not found');
  }

  const existing = snippets[index];
  const updated = {
    ...existing,
    title: typeof updates.title === 'string' && updates.title.trim() !== '' ? updates.title.trim() : existing.title,
    content: typeof updates.content === 'string' && updates.content.trim() !== '' ? updates.content : existing.content,
    tags: updates.tags !== undefined ? normalizeTags(updates.tags) : existing.tags
  };

  snippets[index] = updated;
  store.set('snippets', snippets);
  return updated;
}

/**
 * Deletes a snippet by ID.
 * @param {string} id 
 * @returns {boolean}
 */
function deleteSnippet(id) {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid snippet ID');
  }

  const snippets = store.get('snippets', []);
  const initialLength = snippets.length;
  const filtered = snippets.filter(s => s.id !== id);

  if (filtered.length !== initialLength) {
    store.set('snippets', filtered);
    return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// SETTINGS (Milestone 6)
// -----------------------------------------------------------------------------

/**
 * Returns current application settings.
 * @returns {Object}
 */
function getSettings() {
  return store.get('settings', {
    historyLimit: 200,
    shortcut: 'CommandOrControl+Shift+V',
    launchAtLogin: false,
    showNotifications: true,
    ignoredApps: []
  });
}

/**
 * Updates a specific setting and applies side effects immediately.
 * @param {string} key 
 * @param {*} value 
 * @returns {Object} Updated settings
 */
function setSetting(key, value) {
  if (!key || typeof key !== 'string') {
    throw new Error('Setting key must be a string');
  }

  store.set(`settings.${key}`, value);

  // If historyLimit changed, prune existing history to match new limit immediately
  if (key === 'historyLimit') {
    const limit = Number(value);
    if (!isNaN(limit) && limit > 0) {
      const history = store.get('history', []);
      const pruned = pruneHistory(history, limit);
      store.set('history', pruned);
    }
  }

  return getSettings();
}

module.exports = {
  store,
  getHistory,
  searchHistory,
  addHistoryItem,
  togglePin,
  deleteHistoryItem,
  clearHistory,
  pruneHistory,
  sortHistory,
  // Snippets
  getSnippets,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  // Settings
  getSettings,
  setSetting
};
