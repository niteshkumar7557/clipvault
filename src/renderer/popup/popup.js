/**
 * Popup Renderer Script - Milestone 3
 * 
 * Features:
 * 1. History items retrieval & live update subscription.
 * 2. Keyboard Navigation:
 *    - ArrowDown / ArrowUp to move selection.
 *    - Enter to copy selected item to clipboard and hide popup.
 *    - Esc to dismiss/hide the popup.
 * 3. Mouse click to copy.
 * 4. Window focus/shown reset.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const emptyState = document.getElementById('empty-state');
  const historyList = document.getElementById('history-list');
  const itemCountBadge = document.getElementById('item-count-badge');

  let items = [];
  let selectedIndex = 0;

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

    // Clamp or wrap selection index
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
        // Ensure the active item stays in visible scroll area
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
      return;
    }

    emptyState.style.display = 'none';
    historyList.style.display = 'flex';
    itemCountBadge.textContent = items.length;

    // Build the items HTML
    const html = items.map((item, index) => {
      const escapedContent = escapeHtml(item.content);
      const timeStr = formatTimestamp(item.createdAt);
      const isPinned = item.pinned ? '📌' : '';
      const charCount = `${item.content.length}c`;
      const isSelected = index === selectedIndex ? 'selected' : '';

      return `
        <li class="history-item ${isSelected}" data-id="${item.id}" data-index="${index}">
          <div class="item-meta">
            <span class="item-time">${timeStr}</span>
            <div class="item-tags">
              ${isPinned ? `<span class="type-pill">${isPinned}</span>` : ''}
              <span class="type-pill">${charCount}</span>
            </div>
          </div>
          <div class="item-content">${escapedContent}</div>
        </li>
      `;
    }).join('');

    historyList.innerHTML = html;

    // Attach click handlers to each card
    const itemElements = historyList.querySelectorAll('.history-item');
    itemElements.forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        const idx = parseInt(el.getAttribute('data-index'), 10);
        updateSelection(idx);
        copyItem(id);
      });
    });

    // Ensure valid selection
    if (selectedIndex < 0 || selectedIndex >= items.length) {
      updateSelection(0);
    }
  }

  // 1. Initial Load: Fetch history from main store
  try {
    const initialItems = await window.api.history.get();
    renderHistory(initialItems);
  } catch (err) {
    console.error('[Popup] Failed to load initial history:', err);
  }

  // 2. Real-Time Subscription: Listen for live updates emitted by main process
  window.api.onHistoryUpdated((updatedItems) => {
    renderHistory(updatedItems);
  });

  // 3. Reset selection when window is summoned
  if (window.api.onWindowShown) {
    window.api.onWindowShown(() => {
      updateSelection(0);
    });
  }

  // 4. Keyboard Navigation: Up, Down, Enter, Esc
  window.addEventListener('keydown', (e) => {
    // Esc: Hide popup window
    if (e.key === 'Escape') {
      e.preventDefault();
      window.api.window.hide();
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
