/**
 * Popup Renderer Script - Milestone 2
 * 
 * Handles:
 * 1. Initial retrieval of history items via `window.api.history.get()`
 * 2. Real-time updates via `window.api.onHistoryUpdated(callback)`
 * 3. DOM rendering with HTML escaping and relative timestamps
 * 4. Window pin toggle for testing blur behavior
 */

document.addEventListener('DOMContentLoaded', async () => {
  const emptyState = document.getElementById('empty-state');
  const historyList = document.getElementById('history-list');
  const itemCountBadge = document.getElementById('item-count-badge');
  const pinWindowBtn = document.getElementById('pin-window-btn');
  const pinStatusText = document.getElementById('pin-status-text');
  const quickPingBtn = document.getElementById('quick-ping-btn');

  /**
   * Safely escapes HTML strings to prevent XSS from copied code/text.
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
   * Formats a timestamp into a friendly relative or short time string.
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
   * Renders the list of history items into the DOM.
   * @param {Array} items 
   */
  function renderHistory(items) {
    if (!items || items.length === 0) {
      emptyState.style.display = 'block';
      historyList.style.display = 'none';
      historyList.innerHTML = '';
      itemCountBadge.textContent = '0';
      return;
    }

    emptyState.style.display = 'none';
    historyList.style.display = 'flex';
    itemCountBadge.textContent = items.length;

    // Build the items HTML
    const html = items.map((item, index) => {
      const escapedContent = escapeHtml(item.content);
      const timeStr = formatTimestamp(item.createdAt);
      const isPinned = item.pinned ? '📌 Pinned' : '';
      const charCount = `${item.content.length} chars`;

      return `
        <li class="history-item" data-id="${item.id}" data-index="${index}">
          <div class="item-meta">
            <span class="item-time">${timeStr}</span>
            <div class="item-tags">
              ${isPinned ? `<span class="type-pill">${isPinned}</span>` : ''}
              <span class="type-pill">${charCount}</span>
              <span class="type-pill">${item.type || 'TEXT'}</span>
            </div>
          </div>
          <div class="item-content">${escapedContent}</div>
        </li>
      `;
    }).join('');

    historyList.innerHTML = html;
  }

  // 1. Initial Load: Fetch history from main store
  try {
    const initialItems = await window.api.history.get();
    renderHistory(initialItems);
  } catch (err) {
    console.error('Failed to load initial history:', err);
  }

  // 2. Real-Time Subscription: Listen for live updates emitted by main process
  window.api.onHistoryUpdated((updatedItems) => {
    console.log('[Popup] Live history update received:', updatedItems.length, 'items');
    renderHistory(updatedItems);
  });

  // 3. Window Pin Toggle (Controls whether window stays open or hides on blur)
  if (pinWindowBtn && window.api.window) {
    try {
      const isPinned = await window.api.window.getStayOpen();
      updatePinUI(isPinned);

      pinWindowBtn.addEventListener('click', async () => {
        const currentlyPinned = pinWindowBtn.classList.contains('active');
        const newState = await window.api.window.setStayOpen(!currentlyPinned);
        updatePinUI(newState);
      });
    } catch (err) {
      console.warn('StayOpen window API unavailable:', err);
    }
  }

  function updatePinUI(pinned) {
    if (pinned) {
      pinWindowBtn.classList.add('active');
      pinStatusText.textContent = 'Pinned';
      pinWindowBtn.title = 'Window stays visible on blur (useful for live copy testing)';
    } else {
      pinWindowBtn.classList.remove('active');
      pinStatusText.textContent = 'Auto-hide';
      pinWindowBtn.title = 'Window will hide when clicking away (design Section 9)';
    }
  }

  // 4. Quick Ping Button: Verifies IPC connection
  if (quickPingBtn) {
    quickPingBtn.addEventListener('click', async () => {
      try {
        const reply = await window.api.ping();
        const originalText = quickPingBtn.textContent;
        quickPingBtn.textContent = '✓ ' + reply;
        quickPingBtn.style.color = '#34c759';
        setTimeout(() => {
          quickPingBtn.textContent = originalText;
          quickPingBtn.style.color = '';
        }, 1500);
      } catch (err) {
        quickPingBtn.textContent = 'Ping failed';
      }
    });
  }
});
