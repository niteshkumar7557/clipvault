/**
 * Popup Renderer Script - Milestone 5
 * 
 * Features:
 * 1. Live search filtering as the user types (`history:search`).
 * 2. Pinned items displayed first with pin badges (`📌`).
 * 3. Right-click native context menu via `Menu.popup` (`history:contextMenu`).
 * 4. Inline quick actions (Pin toggle, Delete).
 * 5. Full keyboard navigation (Arrow keys, Enter, Esc).
 */

document.addEventListener('DOMContentLoaded', async () => {
  const emptyState = document.getElementById('empty-state');
  const emptyTitle = document.getElementById('empty-title');
  const emptyDesc = document.getElementById('empty-desc');
  const emptyIcon = document.getElementById('empty-icon');
  const historyList = document.getElementById('history-list');
  const itemCountBadge = document.getElementById('item-count-badge');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');

  let items = [];
  let selectedIndex = 0;
  let currentSearchQuery = '';

  /**
   * Safely escapes HTML strings to prevent XSS.
   * @param {string} str 
   * @returns {string}
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Formats a timestamp into a friendly relative time string.
   * @param {number} timestamp 
   * @returns {string}
   */
  function formatTimestamp(timestamp) {
    if (!timestamp) return 'Just now';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  /**
   * Updates the selected item index and scrolls it into view.
   * @param {number} newIndex 
   */
  function updateSelection(newIndex) {
    if (items.length === 0) {
      selectedIndex = -1;
      return;
    }

    if (newIndex < 0) {
      selectedIndex = items.length - 1;
    } else if (newIndex >= items.length) {
      selectedIndex = 0;
    } else {
      selectedIndex = newIndex;
    }

    const itemElements = historyList.querySelectorAll('.history-item');
    itemElements.forEach((el, index) => {
      if (index === selectedIndex) {
        el.classList.add('selected');
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        el.classList.remove('selected');
      }
    });
  }

  /**
   * Copies the selected item to clipboard and dismisses the popup window.
   * @param {string} id 
   */
  async function copyItem(id) {
    if (!id) return;
    try {
      await window.api.history.copy(id);
    } catch (err) {
      console.error('[Popup] Failed to copy item:', err);
    }
  }

  /**
   * Toggles the pin status of an item.
   * @param {string} id 
   */
  async function togglePinItem(id) {
    if (!id) return;
    try {
      await window.api.history.pin(id);
    } catch (err) {
      console.error('[Popup] Failed to toggle pin:', err);
    }
  }

  /**
   * Deletes a history item.
   * @param {string} id 
   */
  async function deleteItem(id) {
    if (!id) return;
    try {
      await window.api.history.delete(id);
    } catch (err) {
      console.error('[Popup] Failed to delete item:', err);
    }
  }

  /**
   * Renders the list of history items into the DOM.
   * @param {Array} newItems 
   */
  function renderHistory(newItems) {
    items = Array.isArray(newItems) ? newItems : [];

    if (items.length === 0) {
      emptyState.style.display = 'block';
      historyList.style.display = 'none';
      historyList.innerHTML = '';
      itemCountBadge.textContent = '0';
      selectedIndex = -1;

      if (currentSearchQuery.trim() !== '') {
        emptyIcon.textContent = '🔍';
        emptyTitle.textContent = 'No matching clips';
        emptyDesc.textContent = `No history items matched "${escapeHtml(currentSearchQuery)}"`;
      } else {
        emptyIcon.textContent = '✂️';
        emptyTitle.textContent = 'No clipboard history';
        emptyDesc.innerHTML = 'Copy any text with <kbd>⌘C</kbd> to record it here.';
      }
      return;
    }

    emptyState.style.display = 'none';
    historyList.style.display = 'flex';
    itemCountBadge.textContent = items.length;

    // Build the items HTML
    const html = items.map((item, index) => {
      const escapedContent = escapeHtml(item.content);
      const timeStr = formatTimestamp(item.createdAt);
      const isPinned = item.pinned;
      const charCount = `${item.content.length}c`;
      const isSelected = index === selectedIndex ? 'selected' : '';
      const pinnedClass = isPinned ? 'pinned' : '';

      return `
        <li class="history-item ${pinnedClass} ${isSelected}" data-id="${item.id}" data-index="${index}">
          <div class="item-meta">
            <div class="item-left-meta">
              ${isPinned ? '<span class="pin-indicator" title="Pinned item">📌</span>' : ''}
              <span class="item-time">${timeStr}</span>
            </div>
            <div class="item-tags">
              <span class="type-pill">${charCount}</span>
              <div class="item-actions">
                <button class="quick-action-btn pin-btn" title="${isPinned ? 'Unpin' : 'Pin'}">
                  ${isPinned ? 'Unpin' : '📌'}
                </button>
                <button class="quick-action-btn del-btn" title="Delete">🗑️</button>
              </div>
            </div>
          </div>
          <div class="item-content">${escapedContent}</div>
        </li>
      `;
    }).join('');

    historyList.innerHTML = html;

    // Attach event listeners to each card
    const itemElements = historyList.querySelectorAll('.history-item');
    itemElements.forEach((el) => {
      const id = el.getAttribute('data-id');
      const idx = parseInt(el.getAttribute('data-index'), 10);

      // Left Click: Copy
      el.addEventListener('click', (e) => {
        // Ignore if clicking action buttons
        if (e.target.closest('.quick-action-btn')) return;
        updateSelection(idx);
        copyItem(id);
      });

      // Right Click: Native macOS context menu (Milestone 5)
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        updateSelection(idx);
        window.api.history.contextMenu(id);
      });

      // Quick Action: Pin button
      const pinBtn = el.querySelector('.pin-btn');
      if (pinBtn) {
        pinBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          togglePinItem(id);
        });
      }

      // Quick Action: Delete button
      const delBtn = el.querySelector('.del-btn');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteItem(id);
        });
      }
    });

    // Ensure valid selection
    if (selectedIndex < 0 || selectedIndex >= items.length) {
      updateSelection(0);
    }
  }

  /**
   * Refreshes the active history view respecting any active search query.
   */
  async function refreshHistoryView() {
    try {
      if (currentSearchQuery.trim() !== '') {
        const results = await window.api.history.search(currentSearchQuery);
        renderHistory(results);
      } else {
        const allItems = await window.api.history.get();
        renderHistory(allItems);
      }
    } catch (err) {
      console.error('[Popup] Failed to refresh history view:', err);
    }
  }

  // 1. Initial Load: Fetch history from main store
  await refreshHistoryView();

  // 2. Real-Time Subscription: Listen for live updates emitted by main process
  window.api.onHistoryUpdated(() => {
    refreshHistoryView();
  });

  // 3. Search Input Filtering (Milestone 5)
  if (searchInput) {
    searchInput.addEventListener('input', async (e) => {
      currentSearchQuery = e.target.value;
      if (currentSearchQuery.length > 0) {
        clearSearchBtn.style.display = 'flex';
      } else {
        clearSearchBtn.style.display = 'none';
      }
      selectedIndex = 0;
      await refreshHistoryView();
    });

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', async () => {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        selectedIndex = 0;
        await refreshHistoryView();
      });
    }
  }

  // 4. Reset selection and focus search when window is summoned
  if (window.api.onWindowShown) {
    window.api.onWindowShown(() => {
      if (searchInput) {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
      }
      selectedIndex = 0;
      refreshHistoryView();
    });
  }

  // 5. Keyboard Navigation: Up, Down, Enter, Esc
  window.addEventListener('keydown', (e) => {
    // Esc: If search has text, clear search first; otherwise close popup
    if (e.key === 'Escape') {
      e.preventDefault();
      if (currentSearchQuery.length > 0) {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.style.display = 'none';
        selectedIndex = 0;
        refreshHistoryView();
      } else {
        window.api.window.hide();
      }
      return;
    }

    if (items.length === 0) {
      return;
    }

    // Down Arrow: Next item
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      updateSelection(selectedIndex + 1);
      return;
    }

    // Up Arrow: Previous item
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      updateSelection(selectedIndex - 1);
      return;
    }

    // Enter: Copy selected item to clipboard and hide popup
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        copyItem(items[selectedIndex].id);
      }
    }
  });
});
